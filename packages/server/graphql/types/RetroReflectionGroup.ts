import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString
} from 'graphql'
import GraphQLISO8601Type from './GraphQLISO8601Type'
import RetroReflection from './RetroReflection'
import RetrospectiveMeeting from './RetrospectiveMeeting'
import Team from './Team'
import {resolveForSU} from '../resolvers'
import RetroPhaseItem from './RetroPhaseItem'
import {getUserId} from '../../utils/authorization'
import Task from './Task'

const RetroReflectionGroup = new GraphQLObjectType({
  name: 'RetroReflectionGroup',
  description: 'A reflection created during the reflect phase of a retrospective',
  fields: () => ({
    id: {
      type: new GraphQLNonNull(GraphQLID),
      description: 'shortid'
    },
    createdAt: {
      type: new GraphQLNonNull(GraphQLISO8601Type),
      description: 'The timestamp the meeting was created'
    },
    isActive: {
      type: new GraphQLNonNull(GraphQLBoolean),
      description: 'True if the group has not been removed, else false'
    },
    meetingId: {
      type: new GraphQLNonNull(GraphQLID),
      description: 'The foreign key to link a reflection group to its meeting'
    },
    meeting: {
      type: new GraphQLNonNull(RetrospectiveMeeting),
      description: 'The retrospective meeting this reflection was created in',
      resolve: ({meetingId}, _args, {dataLoader}) => {
        return dataLoader.get('newMeetings').load(meetingId)
      }
    },
    phaseItem: {
      type: new GraphQLNonNull(RetroPhaseItem),
      resolve: ({retroPhaseItemId}, _args, {dataLoader}) => {
        return dataLoader.get('customPhaseItems').load(retroPhaseItemId)
      }
    },
    reflections: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(RetroReflection))),
      resolve: async ({id: reflectionGroupId, meetingId}, _args, {dataLoader}) => {
        // use meetingId so we only hit the DB once instead of once per group
        const reflections = await dataLoader.get('retroReflectionsByMeetingId').load(meetingId)
        const filteredReflections = reflections.filter(
          (reflection) => reflection.reflectionGroupId === reflectionGroupId
        )
        filteredReflections.sort((a, b) => (a.sortOrder < b.sortOrder ? 1 : -1))
        return filteredReflections
      }
    },
    retroPhaseItemId: {
      type: new GraphQLNonNull(GraphQLID),
      description: 'The foreign key to link a reflection group to its phaseItem. Immutable.'
    },
    smartTitle: {
      type: GraphQLString,
      description: 'Our auto-suggested title, to be compared to the actual title for analytics',
      resolve: resolveForSU('smartTitle')
    },
    sortOrder: {
      type: new GraphQLNonNull(GraphQLFloat),
      description: 'The sort order of the reflection group in the phase item'
    },
    tasks: {
      type: new GraphQLNonNull(GraphQLList(GraphQLNonNull(Task))),
      description: 'The tasks created for this group in the discussion phase',
      resolve: async ({id: reflectionGroupId, meetingId}, _args, {dataLoader}) => {
        const meeting = await dataLoader.get('newMeetings').load(meetingId)
        const {teamId} = meeting
        const teamTasks = await dataLoader.get('tasksByTeamId').load(teamId)
        return teamTasks.filter((task) => task.reflectionGroupId === reflectionGroupId)
      }
    },
    team: {
      type: Team,
      description: 'The team that is running the retro',
      resolve: async ({meetingId}, _args, {dataLoader}) => {
        const meeting = await dataLoader.get('newMeetings').load(meetingId)
        return dataLoader.get('teams').load(meeting.teamId)
      }
    },
    title: {
      type: GraphQLString,
      description: 'The title of the grouping of the retrospective reflections'
    },
    titleIsUserDefined: {
      type: new GraphQLNonNull(GraphQLBoolean),
      description: 'true if a user wrote the title, else false',
      resolve: ({title, smartTitle}) => {
        return title ? title !== smartTitle : false
      }
    },
    updatedAt: {
      type: GraphQLISO8601Type,
      description: 'The timestamp the meeting was updated at'
    },
    voterIds: {
      type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLID))),
      description: 'A list of voterIds (userIds). Not available to team to preserve anonymity',
      resolve: resolveForSU('voterIds')
    },
    voteCount: {
      type: new GraphQLNonNull(GraphQLInt),
      description: 'The number of votes this group has received',
      resolve: ({voterIds}) => {
        return voterIds ? voterIds.length : 0
      }
    },
    viewerVoteCount: {
      type: GraphQLInt,
      description: 'The number of votes the viewer has given this group',
      resolve: ({voterIds}, _args, {authToken}) => {
        const viewerId = getUserId(authToken)
        return voterIds
          ? voterIds.reduce((sum, voterId) => (voterId === viewerId ? sum + 1 : sum), 0)
          : 0
      }
    }
  })
})

export default RetroReflectionGroup
