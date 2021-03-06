<template>
  <el-date-picker
    :ref="metadata.columnName"
    v-model="value"
    :format="formatView"
    :value-format="formatSend"
    :type="typePicker"
    range-separator="-"
    :placeholder="metadata.help"
    :start-placeholder="$t('components.dateStartPlaceholder')"
    :end-placeholder="$t('components.dateEndPlaceholder')"
    unlink-panels
    class="date-base"
    :readonly="Boolean(metadata.readonly)"
    :disabled="isDisabled"
    :picker-options="typePicker === 'daterange' ? pickerOptionsDateRange : pickerOptionsDate"
    @change="preHandleChange"
  />
</template>

<script>
import { fieldMixin } from '@/components/ADempiere/Field/FieldMixin'

export default {
  name: 'FieldDate',
  mixins: [fieldMixin],
  data() {
    return {
      pickerOptionsDate: {
        shortcuts: [{
          text: this.$t('components.date.Today'),
          onClick(picker) {
            picker.$emit('pick', new Date())
          }
        }, {
          text: this.$t('components.date.Yesterday'),
          onClick(picker) {
            const date = new Date()
            date.setTime(date.getTime() - 3600 * 1000 * 24)
            picker.$emit('pick', date)
          }
        }, {
          text: this.$t('components.date.Week'),
          onClick(picker) {
            const date = new Date()
            const monthEndDay = new Date(date.getFullYear(), date.getMonth() + 1, 0)
            picker.$emit('pick', monthEndDay)
          }
        }]
      },
      pickerOptionsDateRange: {
        shortcuts: [{
          text: this.$t('components.date.Yesterday'),
          onClick(picker) {
            const start = new Date()
            start.setTime(start.getTime() - 3600 * 1000 * 24)
            picker.$emit('pick', [start, start])
          }
        }, {
          text: this.$t('components.date.Week'),
          onClick(picker) {
            const start_date = new Date()
            start_date.setHours(0, 0, 0, 0)
            const end_date = new Date()
            const date = null
            const currenDate = date ? new Date(date) : new Date()
            const first = currenDate.getDate() - currenDate.getDay('monday')
            const last = first - 7
            start_date.setDate(last)
            end_date.setDate(first - 1)
            picker.$emit('pick', [start_date, end_date])
          }
        }, {
          text: this.$t('components.date.LastMonth'),
          onClick(picker) {
            const date = new Date()
            const monthEndDay = new Date(date.getFullYear(), date.getMonth(), 0)
            const monthStartDay = new Date(date.getFullYear(), date.getMonth() - 1, 1)
            picker.$emit('pick', [monthStartDay, monthEndDay])
          }
        }, {
          text: this.$t('components.date.CurrentMonth'),
          onClick(picker) {
            const date = new Date()
            const monthEndDay = new Date(date.getFullYear(), date.getMonth() + 1, 0)
            const monthStartDay = new Date(date.getFullYear(), date.getMonth(), 1)
            picker.$emit('pick', [monthStartDay, monthEndDay])
          }
        }]
      }
    }
  },
  computed: {
    typePicker() {
      let range = ''
      let time = ''
      if (String(this.metadata.displayType) === String(16)) {
        time = 'time'
      }
      if (this.metadata.isRange && !this.metadata.inTable) {
        range = 'range'
      }
      return 'date' + time + range
    },
    /**
     * Parse the date format to be compatible with element-ui
     */
    formatView() {
      let format = this.metadata.VFormat
        .replace(/[Y]/gi, 'y')
        .replace(/[m]/gi, 'M')
        .replace(/[D]/gi, 'd')

      if (format === '') {
        format = 'yyyy-MM-dd'
      }
      if (this.typePicker.replace('range', '') === 'datetime') {
        format = format + ' hh:mm:ss A'
      }
      return format
    },
    formatSend() {
      if (this.formatView) {
        return this.formatView
          .replace(/[h]/gi, 'H')
          .replace(/[aA]/gi, '')
      }
      return undefined
    }
  },
  watch: {
    valueModel(value) {
      if (this.metadata.inTable) {
        this.value = this.parsedDateValue(value)
      }
    },
    'metadata.value'(value) {
      if (!this.metadata.inTable) {
        this.value = this.parsedDateValue(value)
      }
    }
  },
  methods: {
    parsedDateValue(value) {
      // not return undefined to v-model
      if (this.isEmptyValue(value)) {
        return null
      }

      // instance date from long value
      if (typeof value === 'number') {
        value = new Date(value).toUTCString()
      }

      // generate range value
      if (this.metadata.isRange) {
        let valueTo = this.metadata.valueTo
        if (typeof valueTo === 'number') {
          valueTo = new Date(valueTo).toUTCString()
        }
        if (this.isEmptyValue(valueTo)) {
          valueTo = undefined
        }
        value = [value, valueTo]
      }

      return value
    },
    // validate values before send values to store or server
    preHandleChange(value) {
      let startValue, endValue
      startValue = value

      if (this.metadata.isRange && !this.metadata.inTable && Array.isArray(value)) {
        startValue = value[0]
        endValue = value[1]
      }

      if (startValue === null) {
        startValue = undefined
        endValue = undefined
      }

      if (typeof startValue !== 'object' && startValue !== undefined) {
        startValue = new Date(startValue)
        endValue = new Date(endValue)
      }

      this.handleChange(startValue, endValue)
    }
  }
}
</script>

<style scoped>
  .date-base {
    width: 100% !important;
  }
</style>
