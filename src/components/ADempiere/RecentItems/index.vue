<template>
  <el-collapse v-model="activeRecentItems" accordion>
    <el-collapse-item name="recentItems">
      <template slot="title">
        <i class="el-icon-time" style="margin-right: 4px;margin-left: 10px;" /> {{ $t('profile.recentItems') }}
      </template>
      <el-card class="box-card" :body-style="{ padding: '0px' }" shadow="never">
        <div class="recent-items">
          <el-table :data="search.length ? filterResult(search) : recentItems" max-height="455" @row-click="handleClick">
            <el-table-column width="40">
              <template slot-scope="{row}">
                <svg-icon :icon-class="row.icon" class="icon-window" />
              </template>
            </el-table-column>
            <el-table-column>
              <template slot="header" slot-scope="scope" class="clearfix">
                <el-input
                  v-model="search"
                  size="mini"
                  :metadata="scope"
                  :placeholder="$t('table.dataTable.search')"
                />
              </template>
              <template slot-scope="{row}">
                <span>{{ row.displayName }}</span>
                <el-tag class="action-tag">{{ $t(`views.${row.action}`) }}</el-tag>
                <br>
                <span class="time">{{ translateDate(row.updated) }}</span>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-card>
    </el-collapse-item>
  </el-collapse>
</template>

<script>
import { getRecentItems as getRecentItemsFromServer } from '@/api/ADempiere'
import { convertAction } from '@/utils/ADempiere/dictionaryUtils'
export default {
  name: 'RecentItems',
  data() {
    return {
      activeRecentItems: 'recentItems',
      recentItems: [],
      isLoaded: true,
      search: '',
      accentRegexp: /[\u0300-\u036f]/g
    }
  },
  computed: {
    getterRecentItems() {
      return this.$store.getters.getRecentItems
    },
    cachedViews() {
      return this.$store.getters.cachedViews
    }
  },
  mounted() {
    this.getRecentItems()
    this.subscribeChanges()
  },
  methods: {
    checkOpened(uuid) {
      return this.cachedViews.includes(uuid)
    },
    getRecentItems() {
      return new Promise((resolve, reject) => {
        getRecentItemsFromServer()
          .then(response => {
            const recentItems = response.getRecentitemsList().map(item => {
              const actionConverted = convertAction(item.getAction())
              return {
                action: actionConverted.name,
                icon: actionConverted.icon,
                displayName: item.getDisplayname(),
                menuUuid: item.getMenuuuid(),
                menuName: item.getMenuname(),
                windowUuid: item.getWindowuuid(),
                tableId: item.getTableid(),
                recordId: item.getRecordid(),
                uuidRecord: item.getRecorduuid(),
                tabUuid: item.getTabuuid(),
                updated: new Date(item.getUpdated()),
                description: item.getMenudescription()
              }
            })
            this.recentItems = recentItems
            this.isLoaded = false
            resolve(recentItems)
          })
          .catch(error => {
            reject(error)
          })
      })
    },
    handleClick(row) {
      if (!this.isEmptyValue(row.uuidRecord)) {
        this.$router.push({ name: row.menuUuid, query: { action: row.uuidRecord, tabParent: 0 }})
      } else {
        this.$router.push({ name: row.menuUuid })
      }
    },
    subscribeChanges() {
      this.$store.subscribe((mutation, state) => {
        if (mutation.type === 'notifyDashboardRefresh') {
          this.getRecentItems()
        }
      })
    },
    filterResult(search) {
      return this.recentItems.filter(item => this.ignoreAccent(item.displayName).toLowerCase().includes(this.ignoreAccent(search.toLowerCase())))
    },
    ignoreAccent(s) {
      if (!s) { return '' }
      return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    },
    translateDate(value) {
      return this.$d(new Date(value), 'long', this.language)
    }
  }
}
</script>

<style scoped>
  .search_recent {
    width: 50%!important;
    float: right;
  }
	.header {
		padding-bottom: 10px;
	}
	.recent-items {
		height: 455px;
		overflow: auto;
	}
  .time {
    float: left;
    font-size: 11px;
    color: #999;
  }
  .card-box {
    cursor: pointer;
  }
  .card-content {
    font-size: 15px;
  }
  .icon-window {
    font-size: x-large;
    color: #36a3f7;
  }
  .action-tag {
    float: right;
  }
</style>
