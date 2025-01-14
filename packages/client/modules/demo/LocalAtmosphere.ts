import EventEmitter from 'eventemitter3'
import {stringify} from 'flatted'
import {
  Environment,
  FetchFunction,
  Network,
  Observable,
  RecordSource,
  Store,
  SubscribeFunction
} from 'relay-runtime'
import {TASK, TEAM} from '../../utils/constants'
import handlerProvider from '../../utils/relay/handlerProvider'
import Atmosphere from '../../Atmosphere'
import ClientGraphQLServer from './ClientGraphQLServer'
// import sleep from 'universal/utils/sleep'

const store = new Store(new RecordSource())
export default class LocalAtmosphere extends Environment {
  eventEmitter = new EventEmitter()
  clientGraphQLServer = new ClientGraphQLServer(this)
  viewerId = 'demoUser'

  constructor() {
    // @ts-ignore
    super({
      store,
      handlerProvider
    } as any)
    // @ts-ignore
    this._network = Network.create(this.fetchLocal, this.subscribeLocal)
  }

  registerQuery: Atmosphere['registerQuery'] = async (
    _queryKey,
    subscription,
    variables,
    router
  ) => {
    const {name} = subscription
    // runtime error in case relay changes
    if (!name) throw new Error(`Missing name for sub`)
    subscription(this as any, variables, router)
  }

  fetchLocal: FetchFunction = (operation, variables) => {
    return Observable.from(this.fetchLocalPromise(operation, variables))
  }

  fetchLocalPromise = async (operation, variables) => {
    const res = (await this.clientGraphQLServer.fetch(operation.name, variables)) as any
    if (res.endNewMeeting && res.endNewMeeting.isKill) {
      window.localStorage.removeItem('retroDemo')
    } else {
      // await sleep(1000)
      this.clientGraphQLServer.db._updatedAt = new Date()
      window.localStorage.setItem('retroDemo', stringify(this.clientGraphQLServer.db))
    }
    return res
  }

  subscribeLocal: SubscribeFunction = (operation, _variables, _cacheConfig) => {
    return Observable.create((sink) => {
      const channelLookup = {
        TaskSubscription: {
          channel: TASK,
          dataField: 'taskSubscription'
        },
        TeamSubscription: {
          channel: TEAM,
          dataField: 'teamSubscription'
        }
      }
      const fields = channelLookup[operation.name]
      if (fields) {
        this.clientGraphQLServer.on(fields.channel, (data) => {
          sink.next({
            data: {
              [fields.dataField]: data
            }
          })
        })
      }
    })
  }
}
