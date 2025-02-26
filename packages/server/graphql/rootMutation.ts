import {GraphQLObjectType} from 'graphql'
import addAgendaItem from './mutations/addAgendaItem'
import addOrg from './mutations/addOrg'
import archiveTeam from './mutations/archiveTeam'
import clearNotification from './mutations/clearNotification'
import changeTaskTeam from './mutations/changeTaskTeam'
import connectSocket from './mutations/connectSocket'
import createGitHubIssue from './mutations/createGitHubIssue'
import createTask from './mutations/createTask'
import deleteTask from './mutations/deleteTask'
import disconnectSocket from './mutations/disconnectSocket'
import downgradeToPersonal from './mutations/downgradeToPersonal'
import editTask from './mutations/editTask'
import inactivateUser from './mutations/inactivateUser'
import navigateMeeting from './mutations/navigateMeeting'
import promoteNewMeetingFacilitator from './mutations/promoteNewMeetingFacilitator'
import promoteToTeamLead from './mutations/promoteToTeamLead'
import removeAgendaItem from './mutations/removeAgendaItem'
import removeTeamMember from './mutations/removeTeamMember'
import segmentEventTrack from './mutations/segmentEventTrack'
import setOrgUserRole from './mutations/setOrgUserRole'
import startNewMeeting from './mutations/startNewMeeting'
import toggleAgendaList from './mutations/toggleAgendaList'
import updateAgendaItem from './mutations/updateAgendaItem'
import updateCreditCard from './mutations/updateCreditCard'
import updateOrg from './mutations/updateOrg'
import updateTask from './mutations/updateTask'
import updateDragLocation from './mutations/updateDragLocation'
import updateNewCheckInQuestion from './mutations/updateNewCheckInQuestion'
import upgradeToPro from './mutations/upgradeToPro'
import moveTeamToOrg from './mutations/moveTeamToOrg'
import addTeam from './mutations/addTeam'
import updateTeamName from './mutations/updateTeamName'
import removeOrgUser from './mutations/removeOrgUser'
import createOrgPicturePutUrl from './mutations/createOrgPicturePutUrl'
import addFeatureFlag from './mutations/addFeatureFlag'
import createImposterToken from './mutations/createImposterToken'
import createUserPicturePutUrl from './mutations/createUserPicturePutUrl'
import login from './mutations/login'
import updateUserProfile from './mutations/updateUserProfile'
import endNewMeeting from './mutations/endNewMeeting'
import createReflection from './mutations/createReflection'
import updateReflectionContent from './mutations/updateReflectionContent'
import editReflection from './mutations/editReflection'
import removeReflection from './mutations/removeReflection'
import updateReflectionGroupTitle from './mutations/updateReflectionGroupTitle'
import voteForReflectionGroup from './mutations/voteForReflectionGroup'
import newMeetingCheckIn from './mutations/newMeetingCheckIn'
import autoGroupReflections from './mutations/autoGroupReflections'
import endDraggingReflection from './mutations/endDraggingReflection'
import updateTaskDueDate from './mutations/updateTaskDueDate'
import dragDiscussionTopic from './mutations/dragDiscussionTopic'
import startDraggingReflection from './mutations/startDraggingReflection'
import setPhaseFocus from './mutations/setPhaseFocus'
import selectRetroTemplate from './mutations/selectRetroTemplate'
import addReflectTemplate from './mutations/addReflectTemplate'
import addReflectTemplatePrompt from './mutations/addReflectTemplatePrompt'
import moveReflectTemplatePrompt from './mutations/moveReflectTemplatePrompt'
import removeReflectTemplate from './mutations/removeReflectTemplate'
import removeReflectTemplatePrompt from './mutations/removeReflectTemplatePrompt'
import renameReflectTemplate from './mutations/renameReflectTemplate'
import renameReflectTemplatePrompt from './mutations/renameReflectTemplatePrompt'
import inviteToTeam from './mutations/inviteToTeam'
import acceptTeamInvitation from './mutations/acceptTeamInvitation'
import dismissSuggestedAction from './mutations/dismissSuggestedAction'
import dismissNewFeature from './mutations/dismissNewFeature'
import addAtlassianAuth from './mutations/addAtlassianAuth'
import removeAtlassianAuth from './mutations/removeAtlassianAuth'
import createJiraIssue from './mutations/createJiraIssue'
import reflectTemplatePromptUpdateDescription from './mutations/reflectTemplatePromptUpdateDescription'
import addGitHubAuth from './mutations/addGitHubAuth'
import removeGitHubAuth from './mutations/removeGitHubAuth'
import removeSlackAuth from './mutations/removeSlackAuth'
import {GQLContext, InternalContext} from './graphql'
import addSlackAuth from './mutations/addSlackAuth'
import setSlackNotification from './mutations/setSlackNotification'
import setStageTimer from './mutations/setStageTimer'
import pushInvitation from './mutations/pushInvitation'
import denyPushInvitation from './mutations/denyPushInvitation'
import payLater from './mutations/payLater'
import setCheckInEnabled from './mutations/setCheckInEnabled'

interface Context extends InternalContext, GQLContext {}

export default new GraphQLObjectType<any, Context, any>({
  name: 'Mutation',
  fields: () => ({
    acceptTeamInvitation,
    addAtlassianAuth,
    addSlackAuth,
    addAgendaItem,
    addFeatureFlag,
    addGitHubAuth,
    addOrg,
    addTeam,
    archiveTeam,
    autoGroupReflections,
    changeTaskTeam,
    clearNotification,
    connectSocket,
    createImposterToken,
    createGitHubIssue,
    createJiraIssue,
    createOrgPicturePutUrl,
    createReflection,
    createTask,
    createUserPicturePutUrl,
    deleteTask,
    denyPushInvitation,
    disconnectSocket,
    dismissNewFeature,
    dismissSuggestedAction,
    downgradeToPersonal,
    dragDiscussionTopic,
    endDraggingReflection,
    editReflection,
    editTask,
    inactivateUser,
    inviteToTeam,
    endNewMeeting,
    moveTeamToOrg,
    navigateMeeting,
    newMeetingCheckIn,
    payLater,
    pushInvitation,
    promoteNewMeetingFacilitator,
    promoteToTeamLead,
    reflectTemplatePromptUpdateDescription,
    removeAgendaItem,
    removeAtlassianAuth,
    removeGitHubAuth,
    removeOrgUser,
    removeReflection,
    removeSlackAuth,
    removeTeamMember,
    segmentEventTrack,
    selectRetroTemplate,
    setOrgUserRole,
    setPhaseFocus,
    setStageTimer,
    setSlackNotification,
    startDraggingReflection,
    startNewMeeting,
    toggleAgendaList,
    updateAgendaItem,
    updateCreditCard,
    updateOrg,
    updateNewCheckInQuestion,
    updateDragLocation,
    updateReflectionContent,
    updateReflectionGroupTitle,
    updateTask,
    updateTaskDueDate,
    updateTeamName,
    updateUserProfile,
    voteForReflectionGroup,
    login,
    upgradeToPro,
    addReflectTemplate,
    addReflectTemplatePrompt,
    moveReflectTemplatePrompt,
    removeReflectTemplate,
    removeReflectTemplatePrompt,
    renameReflectTemplate,
    renameReflectTemplatePrompt,
    setCheckInEnabled
  })
})
