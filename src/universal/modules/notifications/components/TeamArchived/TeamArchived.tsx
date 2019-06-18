import {css} from 'react-emotion'
import React from 'react'
import {createFragmentContainer, graphql} from 'react-relay'
import AcknowledgeButton from 'universal/modules/notifications/components/AcknowledgeButton/AcknowledgeButton'
import defaultStyles from 'universal/modules/notifications/helpers/styles'
import ClearNotificationMutation from 'universal/mutations/ClearNotificationMutation'
import Row from 'universal/components/Row/Row'
import IconAvatar from 'universal/components/IconAvatar/IconAvatar'
import {TeamArchived_notification} from '__generated__/TeamArchived_notification.graphql'
import useAtmosphere from 'universal/hooks/useAtmosphere'
import useMutationProps from 'universal/hooks/useMutationProps'
import NotificationErrorMessage from 'universal/modules/notifications/components/NotificationErrorMessage'

interface Props {
  notification: TeamArchived_notification
}

const TeamArchived = (props: Props) => {
  const {notification} = props
  const atmosphere = useAtmosphere()
  const {error, submitMutation, onCompleted, onError, submitting} = useMutationProps()
  const {id: notificationId, team} = notification
  const {name: teamName} = team

  const acknowledge = () => {
    if (!submitting) return
    submitMutation()
    ClearNotificationMutation(atmosphere, notificationId, onError, onCompleted)
  }

  return (
    <>
      <Row>
        <IconAvatar icon='archive' size='small' />
        <div className={css(defaultStyles.message)}>
          {'The team '}
          <b>{teamName}</b>
          {' was archived.'}
        </div>
        <AcknowledgeButton onClick={acknowledge} waiting={submitting} />
      </Row>
      <NotificationErrorMessage error={error} />
    </>
  )
}

export default createFragmentContainer(
  TeamArchived,
  graphql`
    fragment TeamArchived_notification on NotifyTeamArchived {
      id
      team {
        name
      }
    }
  `
)
