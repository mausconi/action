import {commitMutation} from 'react-relay'
import graphql from 'babel-plugin-relay/macro'
graphql`
  fragment UpdateTeamNameMutation_team on UpdateTeamNamePayload {
    team {
      name
    }
  }
`

const mutation = graphql`
  mutation UpdateTeamNameMutation($updatedTeam: UpdatedTeamInput!) {
    updateTeamName(updatedTeam: $updatedTeam) {
      error {
        message
      }
      ...UpdateTeamNameMutation_team @relay(mask: false)
    }
  }
`

const UpdateTeamNameMutation = (environment, updatedTeam, onError, onCompleted) => {
  return commitMutation(environment, {
    mutation,
    variables: {updatedTeam},
    optimisticUpdater: (store) => {
      const {id: teamId, name: teamName} = updatedTeam
      store.get(teamId).setValue(teamName, 'name')
    },
    onCompleted,
    onError
  })
}

export default UpdateTeamNameMutation
