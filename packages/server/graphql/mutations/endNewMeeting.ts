import sendSegmentEvent, {sendSegmentIdentify} from '../../utils/sendSegmentEvent'
import {GraphQLID, GraphQLNonNull} from 'graphql'
import getRethink from '../../database/rethinkDriver'
import {getUserId, isTeamMember} from '../../utils/authorization'
import publish from '../../utils/publish'
import {
  ACTION,
  AGENDA_ITEMS,
  DISCUSS,
  DONE,
  LAST_CALL,
  NOTIFICATION,
  RETROSPECTIVE,
  TEAM
} from '../../../client/utils/constants'
import EndNewMeetingPayload from '../types/EndNewMeetingPayload'
import {endSlackMeeting} from './helpers/notifySlack'
import sendNewMeetingSummary from './helpers/endMeeting/sendNewMeetingSummary'
import shortid from 'shortid'
import {COMPLETED_ACTION_MEETING, COMPLETED_RETRO_MEETING} from '../types/TimelineEventTypeEnum'
import removeSuggestedAction from '../../safeMutations/removeSuggestedAction'
import standardError from '../../utils/standardError'
import Meeting, {MeetingType} from '../../database/types/Meeting'
import {DataLoaderWorker, GQLContext} from '../graphql'
import archiveTasksForDB from '../../safeMutations/archiveTasksForDB'
import {ITask} from '../../../client/types/graphql'
import findStageById from '../../../client/utils/meetings/findStageById'
import GenericMeetingPhase from '../../database/types/GenericMeetingPhase'
import {meetingTypeToLabel} from '../../../client/utils/meetings/lookups'
import Task from '../../database/types/Task'
import extractTextFromDraftString from 'parabol-client/utils/draftjs/extractTextFromDraftString'

const timelineEventLookup = {
  [RETROSPECTIVE]: COMPLETED_RETRO_MEETING,
  [ACTION]: COMPLETED_ACTION_MEETING
}

const suggestedActionLookup = {
  [RETROSPECTIVE]: 'tryRetroMeeting',
  [ACTION]: 'tryActionMeeting'
}

type SortOrderTask = Pick<ITask, 'id' | 'sortOrder'>
const updateTaskSortOrders = async (userIds: string[], tasks: SortOrderTask[]) => {
  const r = await getRethink()
  const taskMax = await r
    .table('Task')
    .getAll(r.args(userIds), {index: 'userId'})
    .filter((task) =>
      task('tags')
        .contains('archived')
        .not()
    )
    .max('sortOrder')('sortOrder')
    .default(0)
    .run()
  // mutate what's in the dataloader
  tasks.forEach((task, idx) => {
    task.sortOrder = taskMax + idx + 1
  })
  const updatedTasks = tasks.map((task) => ({
    id: task.id,
    sortOrder: task.sortOrder
  }))
  await r(updatedTasks)
    .forEach((task) => {
      return r
        .table('Task')
        .get(task('id'))
        .update({
          sortOrder: task('sortOrder')
        })
    })
    .run()
  return tasks
}

const clearAgendaItems = async (teamId: string) => {
  const r = await getRethink()
  return r
    .table('AgendaItem')
    .getAll(teamId, {index: 'teamId'})
    .update({
      isActive: false
    })
    .run()
}

const shuffleCheckInOrder = async (teamId: string) => {
  const r = await getRethink()
  return r
    .table('TeamMember')
    .getAll(teamId, {index: 'teamId'})
    .sample(100000)
    .coerceTo('array')
    .do((arr) =>
      arr.forEach((doc) => {
        return r
          .table('TeamMember')
          .get(doc('id'))
          .update({
            checkInOrder: arr.offsetsOf(doc).nth(0)
          })
      })
    )
    .run()
}

const removeEmptyTasks = async (teamId: string, meetingId: string) => {
  const r = await getRethink()
  const createdTasks = await r
    .table<Task>('Task')
    .getAll(teamId, {index: 'teamId'})
    .filter({meetingId})
    .run()

  const removedTaskIds = createdTasks
    .map((task) => ({
      id: task.id,
      plaintextContent: extractTextFromDraftString(task.content)
    }))
    .filter(({plaintextContent}) => plaintextContent.length === 0)
    .map(({id}) => id)
  await r
    .table('Task')
    .getAll(r.args(removedTaskIds))
    .delete()
    .run()
  return removedTaskIds
}

const finishActionMeeting = async (meeting: Meeting, dataLoader: DataLoaderWorker) => {
  const {id: meetingId, teamId} = meeting
  const r = await getRethink()
  const [meetingMembers, tasks, doneTasks] = await Promise.all([
    dataLoader.get('meetingMembersByMeetingId').load(meetingId),
    r
      .table('Task')
      .getAll(teamId, {index: 'teamId'})
      .filter({
        meetingId
      })
      .run(),
    r
      .table('Task')
      .getAll(teamId, {index: 'teamId'})
      .filter({status: DONE})
      .filter((task) =>
        task('tags')
          .contains('archived')
          .not()
      )
      .run()
  ])
  const userIds = meetingMembers.map(({userId}) => userId)
  await Promise.all([
    archiveTasksForDB(doneTasks, meetingId),
    updateTaskSortOrders(userIds, tasks),
    clearAgendaItems(teamId),
    r
      .table('NewMeeting')
      .get(meetingId)
      .update({taskCount: tasks.length})
      .run()
  ])
  return {updatedTaskIds: [...tasks, ...doneTasks].map(({id}) => id)}
}

const finishMeetingType = async (meeting: Meeting, dataLoader: DataLoaderWorker) => {
  if (meeting.meetingType === ACTION) return finishActionMeeting(meeting, dataLoader)
  return undefined
}

const getIsKill = (meetingType: MeetingType, phase: GenericMeetingPhase) => {
  switch (meetingType) {
    case 'action':
      return ![AGENDA_ITEMS, LAST_CALL].includes(phase.phaseType)
    case 'retrospective':
      return ![DISCUSS].includes(phase.phaseType)
  }
}

export default {
  type: new GraphQLNonNull(EndNewMeetingPayload),
  description: 'Finish a new meeting',
  args: {
    meetingId: {
      type: new GraphQLNonNull(GraphQLID),
      description: 'The meeting to end'
    }
  },
  async resolve(_source, {meetingId}, context: GQLContext) {
    const {authToken, socketId: mutatorId, dataLoader} = context
    const r = await getRethink()
    const operationId = dataLoader.share()
    const subOptions = {mutatorId, operationId}
    const now = new Date()
    const viewerId = getUserId(authToken)
    // AUTH
    const meeting = (await r
      .table('NewMeeting')
      .get(meetingId)
      .default(null)
      .run()) as Meeting | null
    if (!meeting) return standardError(new Error('Meeting not found'), {userId: viewerId})
    const {endedAt, facilitatorStageId, meetingNumber, phases, teamId, meetingType} = meeting

    // VALIDATION
    // called by endOldMeetings, SU is OK
    if (!isTeamMember(authToken, teamId) && authToken.rol !== 'su') {
      return standardError(new Error('Team not found'), {userId: viewerId})
    }
    if (endedAt) return standardError(new Error('Meeting already ended'), {userId: viewerId})

    // RESOLUTION
    const currentStageRes = findStageById(phases, facilitatorStageId)
    if (!currentStageRes) {
      return standardError(new Error('Cannot find facilitator stage'), {userId: viewerId})
    }
    const {stage, phase} = currentStageRes
    stage.isComplete = true
    stage.endAt = now

    const completedMeeting = ((await r
      .table('NewMeeting')
      .get(meetingId)
      .update(
        {
          endedAt: now,
          phases
        },
        {returnChanges: true}
      )('changes')(0)('new_val')
      .run()) as unknown) as Meeting

    // remove any empty tasks
    const removedTaskIds = removeEmptyTasks(teamId, meetingId)

    const [meetingMembers, team] = await Promise.all([
      dataLoader.get('meetingMembersByMeetingId').load(meetingId),
      dataLoader.get('teams').load(teamId)
    ])
    const presentMembers = meetingMembers.filter(
      (meetingMember) => meetingMember.isCheckedIn === true
    )
    const presentMemberUserIds = presentMembers.map(({userId}) => userId)
    endSlackMeeting(meetingId, teamId, dataLoader).catch(console.log)

    const result = await finishMeetingType(completedMeeting, dataLoader)
    await shuffleCheckInOrder(teamId)
    const updatedTaskIds = (result && result.updatedTaskIds) || []
    const {facilitatorUserId} = completedMeeting
    const nonFacilitators = presentMemberUserIds.filter((userId) => userId !== facilitatorUserId)
    const traits = {
      wasFacilitator: false,
      teamMembersCount: meetingMembers.length,
      teamMembersPresentCount: presentMembers.length,
      teamId,
      meetingNumber
    }
    const meetingLabel = meetingTypeToLabel[meetingType]
    const eventName = `${meetingLabel} Meeting Completed`
    sendSegmentEvent(eventName, facilitatorUserId, {
      ...traits,
      wasFacilitator: true
    }).catch()
    sendSegmentEvent(eventName, nonFacilitators, traits).catch()
    sendSegmentIdentify(presentMemberUserIds).catch()
    sendNewMeetingSummary(completedMeeting, context).catch(console.log)

    const events = meetingMembers.map((meetingMember) => ({
      id: shortid.generate(),
      createdAt: now,
      interactionCount: 0,
      seenCount: 0,
      type: timelineEventLookup[meetingType],
      userId: meetingMember.userId,
      teamId,
      orgId: team.orgId,
      meetingId
    }))
    await r
      .table('TimelineEvent')
      .insert(events)
      .run()
    if (team.isOnboardTeam) {
      const teamLeadUserId = await r
        .table('TeamMember')
        .getAll(teamId, {index: 'teamId'})
        .filter({isLead: true})
        .nth(0)('userId')
        .run()

      const removedSuggestedActionId = await removeSuggestedAction(
        teamLeadUserId,
        suggestedActionLookup[meetingType]
      )
      if (removedSuggestedActionId) {
        publish(
          NOTIFICATION,
          teamLeadUserId,
          EndNewMeetingPayload,
          {removedSuggestedActionId},
          subOptions
        )
      }
    }

    const data = {
      meetingId,
      teamId,
      isKill: getIsKill(meetingType, phase),
      updatedTaskIds,
      removedTaskIds
    }
    publish(TEAM, teamId, EndNewMeetingPayload, data, subOptions)
    return data
  }
}
