import {GraphQLList, GraphQLObjectType} from 'graphql'
import {
  makeResolveNotificationsForViewer,
  resolveTasks,
  resolveTeam,
  resolveTeamMember,
  resolveUser
} from '../resolvers'
import Notification from './Notification'
import NotifyKickedOut from './NotifyKickedOut'
import Task from './Task'
import Team from './Team'
import TeamMember from './TeamMember'
import User from './User'
import {getUserId} from '../../utils/authorization'
import StandardMutationError from './StandardMutationError'

const RemoveTeamMemberPayload = new GraphQLObjectType({
  name: 'RemoveTeamMemberPayload',
  fields: () => ({
    error: {
      type: StandardMutationError
    },
    teamMember: {
      type: TeamMember,
      description: 'The team member removed',
      resolve: resolveTeamMember
    },
    team: {
      type: Team,
      description: 'The team the team member was removed from',
      resolve: resolveTeam
    },
    updatedTasks: {
      type: new GraphQLList(Task),
      description: 'The tasks that got reassigned',
      resolve: resolveTasks
    },
    user: {
      type: User,
      description: 'The user removed from the team',
      resolve: resolveUser
    },
    removedNotifications: {
      type: new GraphQLList(Notification),
      description: 'Any notifications pertaining to the team that are no longer relevant',
      resolve: makeResolveNotificationsForViewer('', 'removedNotifications')
    },
    kickOutNotification: {
      type: NotifyKickedOut,
      description: 'A notification if you were kicked out by the team leader',
      resolve: async ({notificationId}, args, {authToken, dataLoader}) => {
        if (!notificationId) return null
        const viewerId = getUserId(authToken)
        const notification = await dataLoader.get('notifications').load(notificationId)
        return notification.userIds[0] === viewerId ? notification : null
      }
    }
  })
})

export default RemoveTeamMemberPayload
