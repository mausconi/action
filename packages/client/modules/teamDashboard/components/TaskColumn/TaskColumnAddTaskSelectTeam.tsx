import React from 'react'
import AddTaskButton from '../../../../components/AddTaskButton/AddTaskButton'
import useAtmosphere from '../../../../hooks/useAtmosphere'
import {MenuPosition} from '../../../../hooks/useCoords'
import useMenu from '../../../../hooks/useMenu'
import CreateTaskMutation from '../../../../mutations/CreateTaskMutation'
import {TaskStatusEnum} from '../../../../types/graphql'
import lazyPreload from '../../../../utils/lazyPreload'
import {taskStatusLabels} from '../../../../utils/taskStatus'
import {createFragmentContainer} from 'react-relay'
import graphql from 'babel-plugin-relay/macro'
import {TaskColumnAddTaskSelectTeam_teams} from '__generated__/TaskColumnAddTaskSelectTeam_teams.graphql'

interface Props {
  status: TaskStatusEnum
  sortOrder: number
  teams: TaskColumnAddTaskSelectTeam_teams
}

const SelectTeamDropdown = lazyPreload(() =>
  import(
    /* webpackChunkName: 'SelectTeamDropdown' */
    '../../../../components/SelectTeamDropdown'
  )
)

const TaskColumnAddTaskSelectTeam = (props: Props) => {
  const {sortOrder, status, teams} = props
  const label = taskStatusLabels[status]
  const atmosphere = useAtmosphere()
  const {menuProps, originRef, menuPortal, togglePortal} = useMenu(MenuPosition.UPPER_LEFT)
  const teamHandleClick = (teamId) => () => {
    CreateTaskMutation(
      atmosphere,
      {
        newTask: {
          sortOrder,
          status,
          teamId,
          userId: atmosphere.viewerId
        }
      },
      {}
    )
  }
  return (
    <>
      <AddTaskButton
        ref={originRef}
        onClick={togglePortal}
        onMouseEnter={SelectTeamDropdown.preload}
        label={label}
      />
      {menuPortal(
        <SelectTeamDropdown menuProps={menuProps} teamHandleClick={teamHandleClick} teams={teams} />
      )}
    </>
  )
}

export default createFragmentContainer(TaskColumnAddTaskSelectTeam, {
  teams: graphql`
    fragment TaskColumnAddTaskSelectTeam_teams on Team @relay(plural: true) {
      ...SelectTeamDropdown_teams
    }
  `
})
