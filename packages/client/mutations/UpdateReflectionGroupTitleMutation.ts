/**
 * Updates a reflection's title for the retrospective meeting.
 *
 */
import {commitMutation} from 'react-relay'
import graphql from 'babel-plugin-relay/macro'
import updateProxyRecord from '../utils/relay/updateProxyRecord'
import {IUpdateReflectionGroupTitleOnMutationArguments} from '../types/graphql'
import Atmosphere from '../Atmosphere'
import {LocalHandlers} from '../types/relayMutations'

graphql`
  fragment UpdateReflectionGroupTitleMutation_team on UpdateReflectionGroupTitlePayload {
    reflectionGroup {
      title
      titleIsUserDefined
    }
  }
`

const mutation = graphql`
  mutation UpdateReflectionGroupTitleMutation($title: String!, $reflectionGroupId: ID!) {
    updateReflectionGroupTitle(title: $title, reflectionGroupId: $reflectionGroupId) {
      ...UpdateReflectionGroupTitleMutation_team @relay(mask: false)
    }
  }
`

const UpdateReflectionGroupTitleMutation = (
  atmosphere: Atmosphere,
  variables: IUpdateReflectionGroupTitleOnMutationArguments,
  {onCompleted, onError}: LocalHandlers
) => {
  return commitMutation(atmosphere, {
    mutation,
    variables,
    onCompleted,
    onError,
    optimisticUpdater: (store) => {
      const {reflectionGroupId, title} = variables
      const reflectionGroupProxy = store.get(reflectionGroupId)
      const nowISO = new Date().toJSON()
      const optimisticReflection = {
        title,
        updatedAt: nowISO
      }
      updateProxyRecord(reflectionGroupProxy, optimisticReflection)
    }
  })
}

export default UpdateReflectionGroupTitleMutation
