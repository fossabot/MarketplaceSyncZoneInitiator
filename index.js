const filelog = require('filelog');
var log = filelog.create({
  'file' : 'logs/{YYYY-MM-DD}.log',
  'level' : filelog.WARN | filelog.ERROR 
});
const config = require('config');
const sql = require('mssql');
const connectionString = config.get('ConnectionString');
const overrideServer = config.get('OverrideServer');

sql.on('error', err => {
  log.error("connection error. err: " + err);
  console.error("connection error. err: " + err);
});

sql.connect(connectionString).then(pool => {
  const zoneCode = config.get("ZoneCode");
  const query = config.get('QueryZoneConfig');

  return pool.request()
    .input('ZoneCode', sql.Int, zoneCode)
    .query(query);
}).then(result => {
  const xpath = require('xpath');
  const dom = require('xmldom').DOMParser;
  const eachAsync = require('tiny-each-async');
  const client = require('ssh2-sftp-client');
  const totalRecords = result.recordset.length;
  let finishCount = 0;
  const concurrencyCount = config.get('ConcurrencyCount');
  eachAsync(result.recordset, concurrencyCount, function(item, index, next){
    let xml = item.Config;
    let doc = new dom().parseFromString(xml);
    let username = xpath.select("/items/item[key/string='Username']/value/anyType/text()", doc);
    let password = xpath.select("/items/item[key/string='Password']/value/anyType/text()", doc);
    let port = xpath.select("/items/item[key/string='Port']/value/anyType/text()", doc);
    port = port ? port : 22;
    let server = overrideServer ? overrideServer : xpath.select("/items/item[key/string='Server']/value/anyType/text()", doc);
    const sftp = new client();
    sftp.connect({
      host: server + "",
      username: username + "",
      password: password + "",
      port: parseInt(port)
    }).then(() => {
        return sftp.list('/');
      }).then(d => {
        log.warn('remote dir:');
        log.warn(JSON.stringify(d, null, 4));
        console.log('remote dir:');
        console.dir(d);
      }).catch(e => {
        log.error("connect to sftp server: " + server + ":" + port + " with username: " + username + " password: " + password + " with error: " + e.message);
        console.error("connect to sftp server: " + server + ":" + port + " with username: " + username + " password: " + password + " with error: " + e.message);
      }).finally(() => {
    next();

        return sftp.end();
      });
    finishCount++;
    log.warn("record initiator finished at " + finishCount + "/" + totalRecords, true);
    console.log("record initiator finished at " + finishCount + "/" + totalRecords);
  }, function(err){
    let errorMessage = err ? err : "";
    if(errorMessage) console.log("with error message: " + errorMessage);
  });
}).catch(err => {
  log.error(err);
  console.error(err);
});
