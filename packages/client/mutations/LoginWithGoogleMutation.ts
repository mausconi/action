import {LoginWithGoogleMutation as TLoginWithGoogleMutation} from '../__generated__/LoginWithGoogleMutation.graphql'
import {commitMutation} from 'react-relay'
import graphql from 'babel-plugin-relay/macro'
import SendClientSegmentEventMutation from './SendClientSegmentEventMutation'
import {SegmentClientEventEnum} from '../types/graphql'
import {HistoryLocalHandler, StandardMutation} from '../types/relayMutations'
import getValidRedirectParam from '../utils/getValidRedirectParam'
import handleAuthenticationRedirect from './handlers/handleAuthenticationRedirect'

const mutation = graphql`
  mutation LoginWithGoogleMutation($code: ID!, $invitationToken: ID, $segmentId: ID) {
    loginWithGoogle(code: $code, segmentId: $segmentId, invitationToken: $invitationToken) {
      error {
        message
      }
      authToken
      user {
        tms
        ...UserAnalyticsFrag @relay(mask: false)
      }
    }
    acceptTeamInvitation(invitationToken: $invitationToken) {
      authToken
      team {
        id
        activeMeetings {
          id
        }
      }
    }
  }
`
const LoginWithGoogleMutation: StandardMutation<TLoginWithGoogleMutation, HistoryLocalHandler> = (
  atmosphere,
  variables,
  {onError, onCompleted, history}
) => {
  return commitMutation<TLoginWithGoogleMutation>(atmosphere, {
    mutation,
    variables,
    onError,
    onCompleted: (res, errors) => {
      onCompleted(res, errors)
      const {acceptTeamInvitation, loginWithGoogle} = res
      const authToken = acceptTeamInvitation.authToken || loginWithGoogle.authToken
      atmosphere.setAuthToken(authToken)
      handleAuthenticationRedirect(acceptTeamInvitation, {atmosphere, history})
    }
  })
}

export default LoginWithGoogleMutation