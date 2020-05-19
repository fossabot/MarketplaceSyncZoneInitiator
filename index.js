
const config = require('config');
const sql = require('mssql');
const connectionString = config.get('ConnectionString');
const overrideServer = config.get('OverrideServer');

sql.on('error', err => {
  console.error("connection error. err: " + err);
});

sql.connect(connectionString).then(pool => {
  const zoneCode = config.get("ZoneCode");
  const syncStatus = config.get('SyncStatus');
  const isActive = config.get('IsActive');
  const query = config.get('QueryZoneConfig');

  return pool.request()
    .input('ZoneCode', sql.Int, zoneCode)
    .input('SyncStatus', sql.Int, syncStatus)
    .input('IsActive', sql.Int, isActive)
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
    console.log("server: "+ server + " username: " + username + " password: " + password + " port: " + port);
    sftp.connect({
      host: server,
      username: username,
      password: password,
      port: port
    }).then(() => {
        return sftp.cwd();
      }).then(d => {
        console.log(`remote dir ${d}`);
      }).catch(e => {
        console.error("connect to sftp server: " + server + ":" + port + " with username: " + username + " password: " + password + " with error: " + e.message);
      }).finally(() => {
        return sftp.end();
      });
    finishCount++;
    console.log("record initiator finished at " + finishCount + "/" + totalRecords);
    next();
  }, function(err){
    let errorMessage = err ? err : "";
    if(errorMessage) console.log("with error message: " + errorMessage);
  });

}).catch(err => {
  console.error(err);
});
