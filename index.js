const OrangeDragonflyORMModelToMySQL = require('./src/mysql.js')

class OrangeDragonflyORMModelToSQL {

  static getConverter (driver) {
    if (driver.name === 'MySQLDriver') {
      return OrangeDragonflyORMModelToMySQL
    } else {
      throw new Error('Unknown driver')
    }
  }

}

module.exports = OrangeDragonflyORMModelToSQL
