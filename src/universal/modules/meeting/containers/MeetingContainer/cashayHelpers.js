import subscriptions from 'universal/subscriptions/subscriptions';
import {TEAM, TEAM_MEMBERS} from 'universal/subscriptions/constants';

export const teamQueryString = `
query ($teamId: ID!){
  team: getTeamById(teamId: $teamId) {
    name
    teamMembers {
      isActive
      isLead
      isFacilitator
      user {
        picture
        preferredName
      }
    }
  }
}
`;

export const teamQueryOptions = (teamId) => ({
  component: 'MeetingContainer::Team',
  variables: { teamId }
});

export const teamSubString = subscriptions.find(sub => sub.channel === TEAM).string;
export const teamMembersSubString = subscriptions.find(sub => sub.channel === TEAM_MEMBERS).string;

export const meetingSubOptions = (teamId) => ({
  component: 'MeetingContainer::Meeting',
  variables: { teamId }
});
