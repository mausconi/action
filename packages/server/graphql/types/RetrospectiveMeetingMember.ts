import {GraphQLInt, GraphQLNonNull, GraphQLList, GraphQLObjectType} from 'graphql'
import {GQLContext} from '../graphql'
import MeetingMember, {meetingMemberFields} from './MeetingMember'
import Task from './Task'
import {IRetrospectiveMeetingMember} from '../../../client/types/graphql'

const RetrospectiveMeetingMember = new GraphQLObjectType<IRetrospectiveMeetingMember, GQLContext>({
  name: 'RetrospectiveMeetingMember',
  interfaces: () => [MeetingMember],
  description: 'All the meeting specifics for a user in a retro meeting',
  fields: () => ({
    ...meetingMemberFields(),
    tasks: {
      type: new GraphQLNonNull(GraphQLList(GraphQLNonNull(Task))),
      description: 'The tasks assigned to members during the meeting',
      resolve: async ({meetingId, userId}, _args, {dataLoader}) => {
        const meeting = await dataLoader.get('newMeetings').load(meetingId)
        const {teamId} = meeting
        const teamTasks = await dataLoader.get('tasksByTeamId').load(teamId)
        return teamTasks.filter(
          (task) =>
            task.meetingId === meetingId && task.userId === userId && !task.tags.includes('private')
        )
      }
    },
    votesRemaining: {
      type: new GraphQLNonNull(GraphQLInt)
    }
  })
})

export default RetrospectiveMeetingMember
