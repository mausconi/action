import {GraphQLID, GraphQLNonNull} from 'graphql'
import getRethink from '../../database/rethinkDriver'
import GenericMeetingPhase from '../../database/types/GenericMeetingPhase'
import Meeting from '../../database/types/Meeting'
import {GQLContext} from '../graphql'
import createMeetingMembers from './helpers/createMeetingMembers'
import createNewMeetingPhases from './helpers/createNewMeetingPhases'
import {startSlackMeeting} from './helpers/notifySlack'
import MeetingTypeEnum from '../types/MeetingTypeEnum'
import StartNewMeetingPayload from '../types/StartNewMeetingPayload'
import {getUserId, isTeamMember} from '../../utils/authorization'
import publish from '../../utils/publish'
import standardError from '../../utils/standardError'
import {IStartNewMeetingOnMutationArguments} from '../../../client/types/graphql'
import {SubscriptionChannel} from 'parabol-client/types/constEnums'
import Organization from '../../database/types/Organization'

export default {
  type: new GraphQLNonNull(StartNewMeetingPayload),
  description: 'Start a new meeting',
  args: {
    teamId: {
      type: new GraphQLNonNull(GraphQLID),
      description: 'The team starting the meeting'
    },
    meetingType: {
      type: new GraphQLNonNull(MeetingTypeEnum),
      description: 'The base type of the meeting (action, retro, etc)'
    }
  },
  async resolve(
    _source,
    {teamId, meetingType}: IStartNewMeetingOnMutationArguments,
    {authToken, socketId: mutatorId, dataLoader}: GQLContext
  ) {
    const r = await getRethink()
    const operationId = dataLoader.share()
    const subOptions = {mutatorId, operationId}

    // AUTH
    const viewerId = getUserId(authToken)
    if (!isTeamMember(authToken, teamId)) {
      return standardError(new Error('Team not found'), {userId: viewerId})
    }

    // VALIDATION
    // Not strictly required since we do this below, but cheap enough to prevent extra work
    const activeMeetings = await dataLoader.get('activeMeetingsByTeamId').load(teamId)
    const syncMeetingInProgress = activeMeetings.find((meeting) => !meeting.isAsync)
    if (syncMeetingInProgress) {
      return standardError(new Error('Meeting already started'), {userId: viewerId})
    }

    // RESOLUTION
    const meetingCount = await r
      .table('NewMeeting')
      .getAll(teamId, {index: 'teamId'})
      .count()
      .default(0)
      .run()

    let phases: GenericMeetingPhase[]
    try {
      phases = await createNewMeetingPhases(teamId, meetingCount, meetingType, dataLoader)
    } catch (e) {
      return standardError(new Error('Could not start meeting'), {userId: viewerId})
    }
    const organization = (await r
      .table('Team')
      .get(teamId)('orgId')
      .do((orgId) => r.table('Organization').get(orgId))
      .run()) as Organization

    const {showConversionModal} = organization
    const meeting = new Meeting({
      teamId,
      meetingType,
      meetingCount,
      phases,
      showConversionModal,
      facilitatorUserId: viewerId
    })
    const teamMembers = await dataLoader.get('teamMembersByTeamId').load(meeting.teamId)
    const meetingMembers = await createMeetingMembers(meeting, teamMembers, dataLoader)
    await r
      .table('NewMeeting')
      .insert(meeting)
      .run()

    // Possibly rollback if mutation triggered more than once
    dataLoader.get('activeMeetingsByTeamId').clear(teamId)
    const newActiveMeetings = await dataLoader.get('activeMeetingsByTeamId').load(teamId)
    const otherActiveMeeting = newActiveMeetings.find(
      ({isAsync, id}) => !isAsync && id !== meeting.id
    )
    if (otherActiveMeeting) {
      await r
        .table('NewMeeting')
        .get(meeting.id)
        .delete()
        .run()
      return standardError(new Error('Meeting already started'), {userId: viewerId})
    }

    await r
      .table('MeetingMember')
      .insert(meetingMembers)
      .run()

    startSlackMeeting(teamId, dataLoader, meetingType).catch(console.log)
    const data = {teamId, meetingId: meeting.id}
    publish(SubscriptionChannel.TEAM, teamId, StartNewMeetingPayload, data, subOptions)
    return data
  }
}
