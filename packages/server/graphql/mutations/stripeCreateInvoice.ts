import fetchAllLines from '../../billing/helpers/fetchAllLines'
import generateInvoice from '../../billing/helpers/generateInvoice'
import resolvePromiseObj from '../../../client/utils/resolvePromiseObj'
import {GraphQLBoolean, GraphQLID, GraphQLNonNull} from 'graphql'
import StripeManager from '../../utils/StripeManager'

export default {
  name: 'StripeCreateInvoice',
  description: 'When stripe tells us an invoice is ready, create a pretty version',
  type: GraphQLBoolean,
  args: {
    invoiceId: {
      type: new GraphQLNonNull(GraphQLID),
      description: 'The stripe invoice ID'
    }
  },
  resolve: async (_source, {invoiceId}, {serverSecret}) => {
    // AUTH
    if (serverSecret !== process.env.AUTH0_CLIENT_SECRET) {
      throw new Error('Don’t be rude.')
    }

    // RESOLUTION
    const manager = new StripeManager()
    const stripeLineItems = await fetchAllLines(invoiceId)
    const invoice = await manager.retrieveInvoice(invoiceId)
    const {
      metadata: {orgId}
    } = await manager.retrieveCustomer(invoice.customer as string)
    await resolvePromiseObj({
      newInvoice: generateInvoice(invoice, stripeLineItems, orgId, invoiceId),
      updatedStripeMetadata: manager.updateInvoice(invoiceId, orgId)
    })
    return true
  }
}