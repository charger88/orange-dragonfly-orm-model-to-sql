class OrangeDragonflyORMSchemaToMySQL {

  constructor (comments = false, one_line = false, auto_indexes = false) {
    this._comments = comments
    this._one_line = one_line
    this._auto_indexes = auto_indexes
  }

  _prepareField (model, name) {
    const rule = model.validation_rules[name]
    let field = []
    let unsigned = rule.hasOwnProperty('min') && (rule.min >= 0)
    field.push(name)
    const types = Array.isArray(rule['type']) ? rule['type'] : [rule['type']]
    if (types.includes('boolean')) {
      field.push('TINYINT(1) UNSIGNED')
    } else if (types.includes('integer')) {
      if (rule.hasOwnProperty('max')) {
        if ((unsigned && (rule.max <= 255)) || (!unsigned && (rule.max <= 127))) {
          field.push(`TINYINT(${unsigned ? 3 : 4})`)
        } else if ((unsigned && (rule.max <= 65535)) || (!unsigned && (rule.max <= 32767))) {
          field.push(`SMALLINT(${unsigned ? 5 : 6})`)
        } else if ((unsigned && (rule.max > 4294967295)) || (!unsigned && (rule.max > 2147483647))) {
          field.push(`BIGINT(20)`)
        } else {
          field.push(`INT(${unsigned ? 10 : 11})`)
        }
      } else {
        field.push(`INT(${unsigned ? 10 : 11})`)
      }
      if (unsigned) {
        field.push('UNSIGNED')
      }
    } else if (types.includes('string')) {
      if (!rule.hasOwnProperty('max')) {
        field.push('TEXT')
      } else {
        if (rule.hasOwnProperty('min') && (rule.min === rule.max)) {
          field.push(`CHAR(${rule.max})`)
        } else {
          field.push(`VARCHAR(${rule.max})`)
        }
      }
    } else if (types.includes('number')) {
      field.push('FLOAT')
    } else if (types.includes('array') || types.includes('object')) {
      field.push('JSON')
    }
    if (!types.includes('null')){
      field.push('NOT NULL')
    }
    if (rule.hasOwnProperty('default')) {
      if (types.includes('boolean')) {
        field.push(`DEFAULT ${rule.hasOwnProperty('default') ? `${rule.default ? 1 : 0}`: ''}`)
      } else {
        field.push(`DEFAULT ${rule.hasOwnProperty('default') ? `'${rule.default}'`: ''}`)
      }
    } else if (types.includes('null')) {
      field.push('DEFAULT NULL')
    }
    if (name === model.id_key) {
      field.push('AUTO_INCREMENT')
    }
    return field.join(' ')
  }

  _generateTableSQL(model) {
    let sql = this._comments ? `# Create table "${model.table}" for model "${model.name}" \n\n` : ''
    sql += `CREATE TABLE ${model.table} (\n\t`
    sql += Object.keys(model.validation_rules).map(name => {
      return this._prepareField(model, name)
    }).join(this._one_line ? ", " : ",\n\t")
    sql += `,${this._one_line ? " " : "\n\t"}PRIMARY KEY (${model.id_key})`
    sql += `${this._one_line ? "" : "\n"});`
    return sql
  }

  _generateDropTableSQL(model) {
    return `DROP TABLE IF EXISTS ${model.table};`
  }

  _generateIndexes(model) {
    const indexes = {}
    for (let rel of Object.values(model.available_relations)) {
      if ((rel.mode === 'child') || (rel.mode === 'children')) {
        indexes[`${rel.b.table}.${rel._b_key_by_mode}`] = 'index'
      } else if ((rel.mode === 'parent')) {
        indexes[`${rel.a.table}.${rel._a_key_by_mode}`] = 'index'
      } else {
        indexes[`${rel.class_via.table}.${rel.via_a_key}`] = 'index'
        indexes[`${rel.b.table}.${rel._b_key_by_mode}`] = 'index'
      }
    }
    return indexes
  }

  _convertIndexesToSql(indexes) {
    const queries = []
    for (let index of Object.keys(indexes)) {
      queries.push(`CREATE INDEX ${indexes[index]}_${index.replace('.', '__')} ON ${index.split('.')[0]} (${index.split('.')[1]});`)
    }
    return queries
  }

  /**
   *
   * @param {Array} models
   * @return {string[]}
   */
  convert (models) {
    const queries = []
    let indexes = {}
    for (const model of models) {
      queries.push(this._generateTableSQL(model))
      if (this._auto_indexes) {
        Object.assign(indexes, this._generateIndexes(model))
      }
    }
    if (this._auto_indexes) {
      queries.push(...this._convertIndexesToSql(indexes))
    }
    return queries
  }

  /**
   *
   * @param {Array} models
   * @return {string[]}
   */
  drop (models) {
    const queries = []
    for (const model of models) {
      queries.push(this._generateDropTableSQL(model))
    }
    return queries
  }

}

module.exports = OrangeDragonflyORMSchemaToMySQL
