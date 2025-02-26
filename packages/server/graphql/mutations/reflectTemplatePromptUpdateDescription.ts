import {GraphQLID, GraphQLNonNull, GraphQLString} from 'graphql'
import getRethink from '../../database/rethinkDriver'
import {getUserId, isTeamMember} from '../../utils/authorization'
import publish from '../../utils/publish'
import {TEAM} from '../../../client/utils/constants'
import standardError from '../../utils/standardError'
import ReflectTemplatePromptUpdateDescriptionPayload from '../types/ReflectTemplatePromptUpdateDescriptionPayload'

const reflectTemplatePromptUpdateDescription = {
  description: 'Update the description of a reflection prompt',
  type: ReflectTemplatePromptUpdateDescriptionPayload,
  args: {
    promptId: {
      type: new GraphQLNonNull(GraphQLID)
    },
    description: {
      type: new GraphQLNonNull(GraphQLString)
    }
  },
  async resolve(_source, {promptId, description}, {authToken, dataLoader, socketId: mutatorId}) {
    const r = await getRethink()
    const now = new Date()
    const operationId = dataLoader.share()
    const subOptions = {operationId, mutatorId}
    const prompt = await r
      .table('CustomPhaseItem')
      .get(promptId)
      .run()
    const viewerId = getUserId(authToken)

    // AUTH
    if (!prompt || !isTeamMember(authToken, prompt.teamId) || !prompt.isActive) {
      return standardError(new Error('Team not found'), {userId: viewerId})
    }

    // VALIDATION
    const {teamId} = prompt
    const normalizedDescription = description.trim().slice(0, 256) || ''

    // RESOLUTION
    await r
      .table('CustomPhaseItem')
      .get(promptId)
      .update({
        description: normalizedDescription,
        updatedAt: now
      })
      .run()

    const data = {promptId}
    publish(TEAM, teamId, ReflectTemplatePromptUpdateDescriptionPayload, data, subOptions)
    return data
  }
}

export default reflectTemplatePromptUpdateDescription
