<template>
  <el-tabs v-model="currentTab" type="border-card" :before-leave="handleBeforeLeave" @tab-click="handleClick">
    <template v-for="(tabAttributes, key) in getTabsList">
      <el-tab-pane
        :key="key"
        :label="tabAttributes.name"
        :windowuuid="windowUuid"
        :tabuuid="tabAttributes.uuid"
        :name="String(key)"
        lazy
        :disabled="Boolean(key > 0 && isCreateNew)"
        :style="isShowedDetail ? { height: '100%', overflow: 'hidden' } : { height: '75vh', overflow: 'auto' }"
      >
        <main-panel
          :parent-uuid="windowUuid"
          :container-uuid="tabAttributes.uuid"
          :metadata="tabAttributes"
          :group-tab="tabAttributes.tabGroup"
          :panel-type="panelType"
          :is-re-search="Boolean(key == 0 || (key > 0 && firstTableName != tabAttributes.tableName))"
        />
      </el-tab-pane>
    </template>
  </el-tabs>
</template>

<script>
import { tabMixin } from '@/components/ADempiere/Tab/tabMixin'
import MainPanel from '@/components/ADempiere/Panel'

export default {
  name: 'TabParent',
  components: {
    MainPanel
  },
  mixins: [tabMixin],
  computed: {
    // if tabs children is showed or closed
    isShowedDetail() {
      const window = this.$store.getters.getWindow(this.windowUuid)
      if (window) {
        return window.isShowedDetail
      }
      return undefined
    }
  },
  watch: {
    // TODO: Remove watchers of action, and pased as props from window
    '$route.query.action'(actionValue) {
      if (actionValue === 'create-new') {
        this.currentTab = '0'
      }
    },
    currentTab(newValue, oldValue) {
      if (newValue !== oldValue) {
        this.$router.push({
          query: {
            ...this.$route.query,
            tabParent: String(newValue)
          },
          params: {
            ...this.$route.params
          }
        })
        this.$route.meta.tabUuid = this.tabUuid
      }
    }
  }
}
</script>
