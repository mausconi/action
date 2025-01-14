import dns, {MxRecord} from 'dns'
import {GraphQLID, GraphQLNonNull} from 'graphql'
import rateLimit from '../rateLimit'
import VerifiedInvitationPayload from '../types/VerifiedInvitationPayload'
import getRethink from '../../database/rethinkDriver'
import promisify from 'es6-promisify'
import getSAMLURLFromEmail from '../../utils/getSAMLURLFromEmail'
import {ITeam} from 'parabol-client/types/graphql'
import User from '../../database/types/User'
import {GQLContext} from '../graphql'

const resolveMx = promisify(dns.resolveMx, dns)

const getIsGoogleProvider = async (user: any, email: string) => {
  if (user && user.identities) {
    return !!user.identities.find((identity) => identity.provider === 'google-oauth2')
  }
  const [, domain] = email.split('@')
  let res
  try {
    res = await resolveMx(domain)
  } catch (e) {
    return false
  }
  const [mxRecord] = res as MxRecord[]
  const exchange = (mxRecord && mxRecord.exchange) || ''
  return exchange.toLowerCase().endsWith('google.com')
}

export default {
  type: new GraphQLNonNull(VerifiedInvitationPayload),
  args: {
    token: {
      type: new GraphQLNonNull(GraphQLID),
      description: 'The invitation token'
    }
  },
  resolve: rateLimit({perMinute: 60, perHour: 1800})(
    async (_source, {token}, {dataLoader}: GQLContext) => {
      const r = await getRethink()
      const now = new Date()
      const teamInvitation = await r
        .table('TeamInvitation')
        .getAll(token, {index: 'token'})
        .nth(0)
        .default(null)
        .run()
      if (!teamInvitation) return {errorType: 'notFound'}
      const {email, acceptedAt, expiresAt, invitedBy, teamId} = teamInvitation
      const {team, inviter} = await r({
        team: (r.table('Team').get(teamId) as unknown) as ITeam,
        inviter: (r.table('User').get(invitedBy) as unknown) as User
      }).run()
      const activeMeetings = await dataLoader.get('activeMeetingsByTeamId').load(teamId)
      const [firstActiveMeeting] = activeMeetings
      const meetingType = firstActiveMeeting?.meetingType ?? null
      if (acceptedAt) {
        return {
          errorType: 'accepted',
          teamName: team.name,
          meetingType,
          inviterName: inviter.preferredName,
          inviterEmail: inviter.email,
          teamInvitation
        }
      }

      if (expiresAt < now) {
        return {
          errorType: 'expired',
          teamName: team.name,
          inviterName: inviter.preferredName,
          inviterEmail: inviter.email
        }
      }

      const viewer = await r
        .table('User')
        .getAll(email, {index: 'email'})
        .nth(0)
        .default(null)
        .run()
      const userId = viewer ? viewer.id : null
      const ssoURL = await getSAMLURLFromEmail(email, true)
      const isGoogle = await getIsGoogleProvider(viewer, email)
      return {
        ssoURL,
        teamName: team.name,
        meetingType,
        inviterName: inviter.preferredName,
        inviterEmail: inviter.email,
        teamInvitation,
        isGoogle,
        userId
      }
    }
  )
}
