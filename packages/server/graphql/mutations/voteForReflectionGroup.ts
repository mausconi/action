import {GraphQLBoolean, GraphQLID, GraphQLNonNull} from 'graphql'
import getRethink from '../../database/rethinkDriver'
import {getUserId, isTeamMember} from '../../utils/authorization'
import publish from '../../utils/publish'
import {RETROSPECTIVE, TEAM, VOTE} from '../../../client/utils/constants'
import isPhaseComplete from '../../../client/utils/meetings/isPhaseComplete'
import VoteForReflectionGroupPayload from '../types/VoteForReflectionGroupPayload'
import safelyCastVote from './helpers/safelyCastVote'
import safelyWithdrawVote from './helpers/safelyWithdrawVote'
import unlockAllStagesForPhase from '../../../client/utils/unlockAllStagesForPhase'
import standardError from '../../utils/standardError'
import {NewMeetingPhaseTypeEnum} from 'parabol-client/types/graphql'

export default {
  type: VoteForReflectionGroupPayload,
  description: 'Cast your vote for a reflection group',
  args: {
    isUnvote: {
      type: GraphQLBoolean,
      description: 'true if the user wants to remove one of their votes'
    },
    reflectionGroupId: {
      type: new GraphQLNonNull(GraphQLID)
    }
  },
  async resolve(
    _source,
    {isUnvote, reflectionGroupId},
    {authToken, dataLoader, socketId: mutatorId}
  ) {
    const r = await getRethink()
    const operationId = dataLoader.share()
    const subOptions = {operationId, mutatorId}

    // AUTH
    const viewerId = getUserId(authToken)
    const reflectionGroup = await r
      .table('RetroReflectionGroup')
      .get(reflectionGroupId)
      .run()
    if (!reflectionGroup || !reflectionGroup.isActive) {
      return standardError(new Error('Reflection group not found'), {userId: viewerId})
    }
    const {meetingId} = reflectionGroup
    const meeting = await dataLoader.get('newMeetings').load(meetingId)
    const {endedAt, phases, teamId} = meeting
    if (!isTeamMember(authToken, teamId)) {
      return standardError(new Error('Team not found'), {userId: viewerId})
    }
    if (endedAt) return standardError(new Error('Meeting already ended'), {userId: viewerId})
    if (isPhaseComplete(VOTE, phases)) {
      return standardError(new Error('Meeting phase already completed'), {userId: viewerId})
    }

    // VALIDATION
    const meetingMember = await r
      .table('MeetingMember')
      .getAll(meetingId, {index: 'meetingId'})
      .filter({userId: viewerId})
      .nth(0)
      .default(null)
      .run()
    if (!meetingMember) {
      return standardError(new Error('Meeting member not found'), {userId: viewerId})
    }

    // RESOLUTION
    if (isUnvote) {
      const votingError = await safelyWithdrawVote(
        authToken,
        meetingId,
        viewerId,
        reflectionGroupId
      )
      if (votingError) return votingError
    } else {
      const allSettings = await dataLoader.get('meetingSettingsByTeamId').load(teamId)
      const retroSettings = allSettings.find((settings) => settings.meetingType === RETROSPECTIVE)
      const {maxVotesPerGroup} = retroSettings
      const votingError = await safelyCastVote(
        authToken,
        meetingId,
        viewerId,
        reflectionGroupId,
        maxVotesPerGroup
      )
      if (votingError) return votingError
    }
    const reflectionGroups = await dataLoader
      .get('retroReflectionGroupsByMeetingId')
      .load(meetingId)
    const voteCount = reflectionGroups.reduce((sum, group) => sum + group.voterIds.length, 0)

    let isUnlock
    let unlockedStageIds

    if (!isUnvote) {
      const discussPhase = phases.find(
        (phase) => phase.phaseType === NewMeetingPhaseTypeEnum.discuss
      )
      const {stages} = discussPhase
      const [firstStage] = stages
      const {isNavigableByFacilitator} = firstStage
      if (!isNavigableByFacilitator) {
        isUnlock = true
      }
    } else if (voteCount === 0) {
      // technically, this is still a possible race condition if someone removes & adds 1 very quickly
      // but then can fix that by casting another vote, so it's not terrible
      isUnlock = false
    }
    if (isUnlock !== undefined) {
      unlockedStageIds = unlockAllStagesForPhase(
        phases,
        NewMeetingPhaseTypeEnum.discuss,
        true,
        isUnlock
      )
      await r
        .table('NewMeeting')
        .get(meetingId)
        .update({
          phases
        })
        .run()
    }

    const data = {
      meetingId,
      userId: viewerId,
      reflectionGroupId,
      unlockedStageIds
    }
    publish(TEAM, teamId, VoteForReflectionGroupPayload, data, subOptions)
    return data
  }
}
