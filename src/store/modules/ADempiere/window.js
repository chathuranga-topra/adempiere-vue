import {
  getWindow as getWindowMetadata,
  getTab as getTabMetadata
} from '@/api/ADempiere/dictionary'
import { showMessage } from '@/utils/ADempiere'
import language from '@/lang'
import router from '@/router'
import { generateField, getFieldTemplate } from '@/utils/ADempiere/dictionaryUtils'

const window = {
  state: {
    window: [],
    windowIndex: 0
  },
  mutations: {
    addWindow(state, payload) {
      state.window.push(payload)
      state.windowIndex++
    },
    dictionaryResetCacheWindow(state) {
      state.window = []
      state.windowIndex = 0
    },
    changeShowedDetailWindow(state, payload) {
      payload.window.isShowedDetail = payload.changeShowedDetail
    },
    changeShowedRecordWindow(state, payload) {
      payload.window.isShowedRecordNavigation = payload.isShowedRecordNavigation
    },
    setCurrentTab(state, payload) {
      payload.window.currentTabUuid = payload.tabUuid
    },
    setTabIsLoadField(state, payload) {
      payload.tab.isLoadFieldList = payload.isLoadFieldList
    }
  },
  actions: {
    getWindowFromServer({ commit, state, dispatch }, {
      windowUuid,
      routeToDelete
    }) {
      return getWindowMetadata(windowUuid)
        .then(responseWindow => {
          const firstTab = responseWindow.tabsList[0].tableName
          const firstTabUuid = responseWindow.tabsList[0].uuid
          const childrenTabs = []
          const parentTabs = []

          const tabsSequence = []
          // TODO Add source tab on the server for tabs Translation and Sort
          const tabs = responseWindow.tabsList.filter(itemTab => {
            if (itemTab.isSortTab) {
              // TODO: Add convert tab as process function
              tabsSequence.push({
                uuid: itemTab.uuid,
                id: itemTab.id,
                parentUuid: windowUuid,
                containerUuid: itemTab.uuid,
                parentTabUuid: itemTab.parentTabUuid,
                panelType: 'window',
                type: 'sequence',
                isSortTab: itemTab.isSortTab,
                name: itemTab.name,
                description: itemTab.description,
                tableName: itemTab.tableName,
                sortOrderColumnName: itemTab.sortOrderColumnName, // order column
                sortYesNoColumnName: itemTab.sortYesNoColumnName // included column
              })
            }
            // TODO: Add support to isAdvancedTab, isTranslationTab and isHasTree
            return !itemTab.isTranslationTab
          }).map((tabItem, index, list) => {
            // let tab = tabItem
            const tab = {
              ...tabItem,
              containerUuid: tabItem.uuid,
              parentUuid: windowUuid,
              windowUuid: windowUuid,
              tabGroup: tabItem.fieldGroup,
              firstTabUuid: firstTabUuid,
              // relations
              isParentTab: Boolean(firstTab === tabItem.tableName),
              // app properties
              isAssociatedTabSequence: false, // show modal with order tab
              isShowedRecordNavigation: !(tabItem.isSingleRow),
              isLoadFieldList: false,
              index: index
            }
            delete tab.processesList

            // action is dispatch used in vuex
            let actions = []
            actions.push({
              // action to set default values and enable fields not isUpdateable
              name: language.t('window.newRecord'),
              processName: language.t('window.newRecord'),
              type: 'dataAction',
              action: 'resetPanelToNew',
              uuidParent: responseWindow,
              disabled: !tab.isInsertRecord || tab.isReadOnly
            }, {
              // action to delete record selected
              name: language.t('window.deleteRecord'),
              processName: language.t('window.deleteRecord'),
              type: 'dataAction',
              action: 'deleteEntity',
              uuidParent: responseWindow,
              disabled: tab.isReadOnly
            }, {
              // action to undo create, update, delete record
              name: language.t('data.undo'),
              processName: language.t('data.undo'),
              type: 'dataAction',
              action: 'undoModifyData',
              uuidParent: responseWindow,
              disabled: false
            }, {
              name: language.t('data.lockRecord'),
              processName: language.t('data.lockRecord'),
              type: 'dataAction',
              action: 'lockRecord',
              disabled: false,
              hidden: true,
              tableName: '',
              recordId: null
            }, {
              name: language.t('data.unlockRecord'),
              processName: language.t('data.unlockRecord'),
              type: 'dataAction',
              action: 'unlockRecord',
              disabled: false,
              hidden: true,
              tableName: '',
              recordId: null
            })

            if (tab.isSortTab) {
              const tabParent = list.find(itemTab => itemTab.tableName === tab.tableName && !itemTab.isSortTab)
              if (tabParent) {
                tab.tabAssociatedUuid = tabParent.uuid // tab source uuid
                tab.tabAssociatedName = tabParent.name // tab source name
              }
            } else {
              // add tabs sequence associated as process in tab source
              let orderTabs = tabsSequence.filter(itemTab => itemTab.tableName === tab.tableName)
              if (orderTabs.length) {
                orderTabs = orderTabs.map(itemTab => {
                  return {
                    ...itemTab,
                    // appication attributes
                    tabAssociatedUuid: tab.uuid, // tab source
                    tabAssociatedName: tab.name, // tab source
                    action: 'orderSequence',
                    panelType: 'window',
                    type: 'application'
                  }
                })
                actions = actions.concat(orderTabs)
                tab.isAssociatedTabSequence = true
                tab.tabsOrder = orderTabs
              }
            }

            // get processess associated in tab
            if (tabItem.processesList && tabItem.processesList.length) {
              const processList = tabItem.processesList.map(processItem => {
                // TODO: No list of parameters
                // // add process associated in vuex store
                // dispatch('addProcessAssociated', {
                //   processToGenerate: processItem,
                //   containerUuidAssociated: tabItem.uuid
                // })
                return {
                  id: processItem.id,
                  uuid: processItem.uuid,
                  name: processItem.name,
                  type: 'process',
                  panelType: 'process',
                  description: processItem.description,
                  help: processItem.help,
                  isReport: processItem.isReport,
                  isDirectPrint: processItem.isDirectPrint
                }
              })
              actions = actions.concat(processList)
            }
            //  Add process menu
            dispatch('setContextMenu', {
              containerUuid: tab.uuid,
              relations: [],
              actions: actions,
              references: []
            })

            if (tab.isParentTab) {
              parentTabs.push(tab)
            } else {
              childrenTabs.push(tab)
            }
            return tab
          })

          const tabProperties = {
            tabsList: tabs,
            currentTab: parentTabs[0],
            tabsListParent: parentTabs,
            tabsListChildren: childrenTabs,
            // app attributes
            isShowedDetail: Boolean(childrenTabs.length),
            currentTabUuid: parentTabs[0].uuid
          }

          const newWindow = {
            ...responseWindow,
            ...tabProperties,
            isShowedRecordNavigation: undefined,
            firstTabUuid: firstTabUuid,
            windowIndex: state.windowIndex + 1
          }
          commit('addWindow', newWindow)
          return newWindow
        })
        .catch(error => {
          router.push({ path: '/dashboard' })
          dispatch('tagsView/delView', routeToDelete)
          showMessage({
            message: language.t('login.unexpectedError'),
            type: 'error'
          })
          console.warn(`Dictionary Window (State Window) - Error ${error.code}: ${error.message}`)
        })
    },
    getTabAndFieldFromServer({ dispatch, getters }, {
      parentUuid,
      containerUuid,
      panelType = 'window',
      isAdvancedQuery = false
    }) {
      return getTabMetadata(containerUuid)
        .then(tabResponse => {
          const additionalAttributes = {
            parentUuid: parentUuid,
            containerUuid: containerUuid,
            isShowedFromUser: true,
            panelType: panelType,
            tableName: tabResponse.tableName,
            //
            isReadOnlyFromForm: false,
            isAdvancedQuery: isAdvancedQuery
          }

          let fieldUuidsequence = 0
          let fieldLinkColumnName
          //  Convert from gRPC
          const fieldsList = tabResponse.fieldsList.map((fieldItem, index) => {
            fieldItem = generateField(fieldItem, {
              ...additionalAttributes,
              fieldListIndex: index
            })
            if (fieldItem.sequence > fieldUuidsequence) {
              fieldUuidsequence = fieldItem.sequence
            }

            if (fieldItem.isParent) {
              fieldLinkColumnName = fieldItem.columnName
            }

            return fieldItem
          })

          //  Get dependent fields
          fieldsList
            .filter(field => field.parentFieldsList && field.isActive)
            .forEach((field, index, list) => {
              field.parentFieldsList.forEach(parentColumnName => {
                var parentField = list.find(parentField => {
                  return parentField.columnName === parentColumnName && parentColumnName !== field.columnName
                })
                if (parentField) {
                  parentField.dependentFieldsList.push(field.columnName)
                }
              })
            })

          if (!fieldsList.find(field => field.columnName === 'UUID')) {
            const attributesOverwrite = {
              panelType: panelType,
              sequence: (fieldUuidsequence + 10),
              name: 'UUID',
              columnName: 'UUID',
              isAdvancedQuery: isAdvancedQuery,
              componentPath: 'FieldText'
            }
            const field = getFieldTemplate(attributesOverwrite)
            fieldsList.push(field)
          }

          //  Panel for save on store
          const panel = {
            ...getters.getTab(parentUuid, containerUuid),
            isAdvancedQuery: isAdvancedQuery,
            fieldLinkColumnName: fieldLinkColumnName,
            fieldList: fieldsList,
            panelType: panelType,
            // app attributes
            isShowedTotals: false
          }

          dispatch('addPanel', panel)
          dispatch('setTabIsLoadField', {
            parentUuid: parentUuid,
            containerUuid: containerUuid
          })
          return panel
        })
        .catch(error => {
          showMessage({
            message: language.t('login.unexpectedError'),
            type: 'error'
          })
          console.warn(`Dictionary Tab (State Window) - Error ${error.code}: ${error.message}`)
        })
    },
    changeShowedDetailWindow({ commit, state }, {
      containerUuid,
      isShowedDetail = true
    }) {
      const window = state.window.find(itemWindow => {
        return itemWindow.uuid === containerUuid
      })
      commit('changeShowedDetailWindow', {
        window: window,
        changeShowedDetail: isShowedDetail
      })
    },
    changeShowedRecordWindow({ commit, state }, {
      parentUuid,
      isShowedRecordNavigation = true
    }) {
      const window = state.window.find(itemWindow => {
        return itemWindow.uuid === parentUuid
      })
      commit('changeShowedRecordWindow', {
        window: window,
        isShowedRecordNavigation: isShowedRecordNavigation
      })
    },
    /**
     * @param {string} parentUuid
     * @param {string} containerUuid
     */
    setCurrentTab({ commit, getters }, {
      parentUuid,
      containerUuid
    }) {
      commit('setCurrentTab', {
        window: getters.getWindow(parentUuid),
        tabUuid: containerUuid
      })
    },
    /**
     * Indicate if fields is load in tab (containerUuid)
     * @param {string} parentUuid
     * @param {string} containerUuid
     */
    setTabIsLoadField({ commit, getters }, {
      parentUuid, containerUuid
    }) {
      const tab = getters.getTab(parentUuid, containerUuid)
      commit('setTabIsLoadField', {
        tab: tab,
        isLoadFieldList: true
      })
    }
  },
  getters: {
    getWindow: (state) => (windowUuid) => {
      return state.window.find(
        item => item.uuid === windowUuid
      )
    },
    getIsShowedRecordNavigation: (state, getters) => (windowUuid) => {
      const window = getters.getWindow(windowUuid)
      if (window) {
        return window.isShowedRecordNavigation
      }
      return window
    },
    getTab: (state, getters) => (windowUuid, tabUuid) => {
      const window = getters.getWindow(windowUuid)
      if (window) {
        return window.tabsList.find(tabItem => {
          return tabItem.uuid === tabUuid
        })
      }
      return window
    },
    getCurrentTab: (state, getters) => (windowUuid) => {
      const window = getters.getWindow(windowUuid)
      if (window) {
        return window.tabsList.find(tabItem => {
          return tabItem.uuid === window.currentTabUuid
        })
      }
      return {
        isInsertRecord: false
      }
    },
    getTabIsLoadField: (state, getters) => (windowUuid, tabUuid) => {
      const tab = getters.getTab(windowUuid, tabUuid)
      if (tab) {
        return tab.isLoadFieldList
      }
      return tab
    },
    getTableNameFromTab: (state, getters) => (windowUuid, tabUuid) => {
      return getters.getTab(windowUuid, tabUuid).tableName
    }
  }
}

export default window
