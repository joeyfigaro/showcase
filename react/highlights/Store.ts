import create, { UseBoundStore } from 'zustand'
import type { StateTree } from '@showcase/typings'
import createStore from 'zustand/vanilla'
import { functionsIn, omit, startsWith } from 'lodash'
import {
  persist,
  devtools,
  subscribeWithSelector,
  DevtoolsOptions,
  PersistOptions,
} from 'zustand/middleware'
import type { Mutate, StoreApi } from 'zustand'
import type { StoreWrapper } from './types'

type EnhanceStore<S> = Mutate<
  StoreApi<S>,
  [
    ['zustand/devtools', unknown],
    ['zustand/persist', S],
    ['zustand/subscribeWithSelector', S],
  ]
>

export type EnhancedStore = EnhanceStore<StateTree>

export type StoreSetFn = EnhancedStore['setState']
export type StoreGetFn = EnhancedStore['getState']
export type StoreSubscribeFn = Pick<EnhancedStore, 'subscribe'>['subscribe']

type StoreOptions<S> = {
  initializer: (s: StoreSetFn, g: StoreGetFn) => S
  devtools?: Partial<DevtoolsOptions>
  persist?: Partial<PersistOptions<StateTree>>
}

export class Store implements StoreWrapper<StateTree> {
  public store: EnhancedStore
  public hook: UseBoundStore<EnhancedStore>

  constructor(opts: StoreOptions<StateTree>) {
    const devtoolOpts = Object.assign(
      { enabled: import.meta.env.DEV, trace: true } as DevtoolsOptions,
      opts.devtools,
    )
    const persistOpts = Object.assign(
      {
        name: `easyrca-${import.meta.env.MODE}`,
        getStorage: () => window.localStorage,
      } as PersistOptions<StateTree>,
      opts.persist,
    )

    this.store = createStore<StateTree>()(
      persist(
        subscribeWithSelector(
          devtools((set, get) => opts.initializer(set, get), devtoolOpts),
        ),
        persistOpts,
      ),
    )

    this.hook = create(this.store)
  }

  public getState(): StateTree {
    return this.store.getState()
  }

  public setState(...a: Parameters<StoreSetFn>) {
    return this.store.setState(...a)
  }

  public subscribe(...a: Parameters<StoreSubscribeFn>) {
    const [selector, listener, options = {}] = a
    return this.store.subscribe(selector, listener, options)
  }

  public destroy() {
    return this.store.destroy()
  }
}

export const store = new Store({
  initializer: (set, get) => ({
    _hasHydrated: false,
    _setHasHydrated(state: boolean) {
      return set(
        (s) => ({
          ...s,
          _hasHydrated: state,
        }),
        false,
        '@STORE/REHYDRATE',
      )
    },
    i18n: null,
    organization: null,
    token: null,
    trees: null,
    username: null,
    user: null,
    tasks: null,
  }),
  devtools: {},
  persist: {
    partialize(state) {
      const stateFunctionKeys = functionsIn(state)
      const flags = Object.keys(state).filter((x) => startsWith(x, '_'))
      const serializable = omit(state, [
        ...stateFunctionKeys,
        ...flags,
        'tasks',
      ])

      return serializable as StateTree
    },
    onRehydrateStorage() {
      return (state, error) => {
        if (error) {
          console.error(error)
          return
        }

        if (!state?.token) {
          state?.restoreSession()
        } else {
          state?._setHasHydrated(true)
        }
      }
    },
  },
})

export const useStore = create(store.store)
