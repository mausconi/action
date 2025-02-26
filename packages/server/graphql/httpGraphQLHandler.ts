import e from 'express'
import {getUserId} from '../utils/authorization'
import sendToSentry from '../utils/sendToSentry'
import handleGraphQLTrebuchetRequest from './handleGraphQLTrebuchetRequest'
import isQueryAllowed from './isQueryAllowed'
import getQueryString from './getQueryString'

const SSE_PROBLEM_USERS = [] as string[]
export default (sharedDataLoader, rateLimiter, sseClients) => async (
  req: e.Request,
  res: e.Response
) => {
  const connectionId = req.headers['x-correlation-id']
  const authToken = (req as any).user || {}
  const connectionContext = connectionId
    ? sseClients[connectionId as string]
    : {sharedDataLoader, rateLimiter, authToken, ip: req.ip}
  if (!connectionContext) {
    const viewerId = getUserId(authToken)
    if (!SSE_PROBLEM_USERS.includes(viewerId)) {
      SSE_PROBLEM_USERS.push(viewerId)
      sendToSentry(new Error('SSE response not found'), {userId: viewerId})
    }
    res.send('SSE Response not found')
    return
  }
  if (connectionId && connectionContext.authToken.sub !== authToken.sub) {
    const viewerId = getUserId(authToken)
    sendToSentry(new Error('Security: Spoofed SSE connectionId'), {userId: viewerId})
    // quietly fail for cheaters
    res.sendStatus(200)
  }

  if (req.body && req.body.type && req.body.type === 'WRTC_SIGNAL') {
    return
  }
  try {
    const response = await handleGraphQLTrebuchetRequest(req.body, connectionContext, {
      getQueryString,
      isQueryAllowed
    })
    if (response) {
      res.send(response)
    } else {
      res.sendStatus(200)
    }
  } catch (e) {
    const viewerId = getUserId(authToken)
    sendToSentry(e, {userId: viewerId})
    res.send(e.message)
    return
  }
}
