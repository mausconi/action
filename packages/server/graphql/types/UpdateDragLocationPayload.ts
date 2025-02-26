import {GraphQLID, GraphQLNonNull, GraphQLObjectType} from 'graphql'
import RemoteReflectionDrag from './RemoteReflectionDrag'

const UpdateDragLocationPayload = new GraphQLObjectType({
  name: 'UpdateDragLocationPayload',
  fields: () => ({
    remoteDrag: {
      type: new GraphQLNonNull(RemoteReflectionDrag),
      description: 'The drag as sent from the team member'
    },
    userId: {
      type: new GraphQLNonNull(GraphQLID)
    }
  })
})

export default UpdateDragLocationPayload
