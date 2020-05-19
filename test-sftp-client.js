
const client = require('ssh2-sftp-client');
const sftp = new client();
sftp.connect({
    host: "sellerdirect-sftp.seatgeek.com",
    username: "sgs07145",
    password: "nZdbQ469URbauGiI1Q8oWRg2U9Mfqp8W",
    port: 22
    }).then(() => {
        return sftp.list('/');
    }).then(d => {
        console.log(`remote dir ${d}`);
    }).catch(e => {
        console.error("connect to sftp server: " + server + ":" + port + " with username: " + username + " password: " + password + " with error: " + e.message);
    }).finally(() => {
        return sftp.end();
    });