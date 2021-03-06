async function storageGet(item, returnAsArray) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(item, function (data) {
            if (data[item] != undefined)
                resolve(data[item]);
            else if (returnAsArray != undefined && returnAsArray)
                resolve([]);
            else
                resolve({});
        });
    });
}



async function storageSet(data) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set(data, function () {
            resolve('');
        });
    });
}

async function storageRm(data) {
    var status = await storageGet('usr');
    delete status[data];
    await storageSet({ 'usr': status })
}


function getFullTimestamp() {
    let d = new Date();
    let day = d.getDate();
    let month = d.getMonth() + 1;
    let year = d.getFullYear();
    let hours = d.getHours();
    let minutes = d.getMinutes();
    let seconds = d.getSeconds();

    return (month < 10 ? '0' + month : month) + '.' + (day < 10 ? '0' + day : day) + '.' + year + '-' + (hours < 10 ? '0' + hours : hours) + ':' + (minutes < 10 ? '0' + minutes : minutes) + ':' + (seconds < 10 ? '0' + seconds : seconds);
}

/* addition for Duke version */

var users = {
    '1a': {
        // 'status': "",
        'expireDate': ""
    },
    '2b': {
        // 'status': "",
        'expireDate': ""
    },
    '3c': {
        // 'status': "",
        'expireDate': ""
    },
}
// time
function signUpTime() {
    let d = new Date();
    return d.getTime();
}
function signUpTimeMin() {
    let d = new Date();
    return d.getMinutes();
}
// expired
function testExpired(key) {
    var now = signUpTimeMin();
    var comp = users[key].expireDate;
    console.log('now: ' + now + "-" + comp);
    if (now - comp > 10) {
        delete users[key];
    }
}
async function testExpired1(key) {
    var status = await storageGet('usr');
    var comp = status[key].expireDate;
    if (parseInt(comp)-signUpTimeMin() > 0)
        return false;
    return true;
}
function expireDate(key) {
    var comp = users[key].expireDate;
    var nowTime = signUpTime();
    if ((nowTime - comp) / (1000 * 60) <= 0) {
        delete users[key];
    }
}

async function CheckClient(key) {
    var account = await storageGet(key); // active or inactive
    if (key in users) {
        expireDate(key);
        testAutoLogout();
    }
}
// init - set
var firstRegister = async function (accName) {
    var status = await storageGet('usr');
    if (status[accName].expireDate == "") {
        status[accName].expireDate = signUpTimeMin() + 3;
        await storageSet({ 'usr': status });
    }

}
function getDateDMY() {
    var d = new Date();
    var day = d.getDate();
    var month = d.getMonth() + 1;
    var year = d.getFullYear();

    return (day < 10 ? '0' + day : day) + '-' + (month < 10 ? '0' + month : month) + '-' + year;
}

var updateProgressBar = async function () {
    let settings = await storageGet('settings');
    let progress = await storageGet('progress');
    let actionslog = await storageGet('actionslog');
    let todaysDate = getDateDMY();

    let elem = document.getElementById('myBar');
    let width = Math.round(progress.current / progress.total * 100);
    elem.style.width = width + '%';
    document.getElementById('progressStats').textContent = ' ' + progress.current + '/' + progress.total;

    if (actionslog[todaysDate] != undefined && actionslog[todaysDate] >= settings['actionsLimit'] && settings['actionsLimit'] > 0) {
        elem.style.width = '100%';
        document.getElementById('progressStats').textContent = 'Daily actions limit reached';

        document.getElementById('stop').style.display = 'none';
        document.getElementById('return').style.display = 'block';
    }
    else if (progress.current != undefined && progress.current == progress.total) {
        document.getElementById('stop').style.display = 'none';
        document.getElementById('return').style.display = 'block';
        document.getElementById('progressStats').textContent = 'Complete';
    }
    else {
        document.getElementById('stop').style.display = 'block';
        document.getElementById('return').style.display = 'none';
    }
}



// add event listeners for tab items
var tabSelection = async function () {
    var elements = document.getElementsByClassName('category-type');

    for (var i = 0; i < elements.length; i++)
        elements[i].addEventListener('click', tabSelectionEventListeners, false);

    chrome.runtime.sendMessage({ "message": "state" }, function (response) {
        if (response.running == 'true' || response.running === true) {
            updateProgressBar();
            document.querySelector('li[tab="progress-tab"]').click();
            setInterval(updateProgressBar, 1000);
        }
        else
            document.querySelector('li[tab="automation-tab"]').click();
    });
}



// add class to selected tab item
var tabSelectionEventListeners = async function () {
    var elements = document.getElementsByClassName('category-type');

    for (var i = 0; i < elements.length; i++) {
        let tab = elements[i].getAttribute('tab');

        if (elements[i] == this) {
            elements[i].classList.add('selected');
            elements[i].style.display = 'block';
            document.getElementById(tab).style.display = 'block';

            loadAutomationSettings();
        }
        else {
            elements[i].classList.remove('selected');
            elements[i].style.display = 'none';
            document.getElementById(tab).style.display = 'none';
        }
    }
}



// close interface browser action popup
var cancelInterface = async function () {
    window.close();
}



// save text as file
function saveTextAsFile(filename, text) {
    var tempElem = document.createElement('a');
    tempElem.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    tempElem.setAttribute('download', filename);
    tempElem.click();
}



// save automation settings
var saveAutomationSettings = async function () {
    var setting = this;
    var settings = await storageGet('settings');
    settings[setting.id] = (setting.type == 'checkbox' ? setting.checked : setting.value);

    await storageSet({ 'settings': settings });
    
}



// load automation settings
var loadAutomationSettings = async function () {
    var settings = await storageGet('settings');
    var elements = document.getElementsByClassName('automation-settings');

    for (var i = 0; i < elements.length; i++) {
        if (settings[elements[i].id] != undefined) {
            if (elements[i].type != null && elements[i].type == 'checkbox')
                document.getElementById(elements[i].id).checked = settings[elements[i].id];
            else
                document.getElementById(elements[i].id).value = settings[elements[i].id];
        }
        elements[i].addEventListener('input', saveAutomationSettings);
    }
}

// actions limit
var actionsLimit = async function () {
    var settings = await storageGet('settings');
    var subscriptionStatus = await storageGet('subscriptionstatus');

    if (subscriptionStatus == "active") {
        var actions = 0;
    } else {
        var actions = 2;
    }

    settings['actionsLimit'] = actions;
    await storageSet({ 'settings': settings });

    if (actions == 0) {
        document.getElementById('freeversion').style.display = 'none';
        document.getElementById('view-subscription-button').style.display = 'block';
    } else {
        document.getElementById('freeversion').style.display = 'block';
        document.getElementById('view-subscription-button').style.display = 'none';

        let actionslog = await storageGet('actionslog');
        let todaysDate = getDateDMY();
        document.getElementById('dailyactions').textContent = (actionslog[todaysDate] != undefined ? actionslog[todaysDate] : '0') + '/' + actions;

        if (actionslog[todaysDate] != undefined && actionslog[todaysDate] >= settings['actionsLimit']) {
            document.getElementById('startfalse').style.display = 'block';
            document.getElementById('starttrue').style.display = 'none';
            document.getElementById('startfalse').getElementsByTagName('p')[0].textContent = 'Daily actions limit reached';
        }
    }
}

// enable or disable start button
var isStartPossible = function () {
    if (document.getElementById('list').value.trim().length > 1) {
        document.getElementById('start').style.display = 'block';
        document.getElementById('start-blank').style.display = 'none';
    }
    else {
        document.getElementById('start-blank').style.display = 'block';
        document.getElementById('start').style.display = 'none';
    }
}

// send message to background page to pause
var pauseBackground = function () {
    chrome.runtime.sendMessage({ "message": "pause" });
    window.close();
}

var testAutoLogout = async function () {

    console.log('test start button and log fucking out');

    await storageSet({ 'email': null });
    await storageSet({ 'subscriptionstatus': "inactive" });

    document.getElementById('upgrade-options').style.display = 'block';
    document.getElementById('active-options').style.display = 'none';

    document.getElementById('current-email').textContent = "not set";
    document.getElementById('current-status').textContent = "inactive";

    document.getElementById('logout-success').style.display = 'block';

    document.getElementById('freeversion').style.display = 'block';
    document.getElementById('view-subscription-button').style.display = 'none';
    actionsLimit();
}

// send message to background page to continue
var continueBackground = function () {
    chrome.runtime.sendMessage({ "message": "continue" });
    window.close();
}

// returns null or email
async function getSubscriptionStatus(email) {
    // const init = {
    //     method: 'GET',
    //     async: true,
    //     headers: {
    //         'Content-Type': 'application/json'
    //     },
    //     'contentType': 'json'
    // };

    // const response = await fetch('https://boostextensions.com/donelikes/emailverify.php?email=' + email, init);
    // const data = await response.json();

    // return data.status;
    var usr = await storageGet('usr');
    if (email in usr) {
        return "active";
    }
    return "inactive";
}

async function checkSubscriptionStatus() {
    email = await storageGet('email');

    if (email.length > 0) {
        subscriptionStatus = await getSubscriptionStatus(email);
        // subscriptionStatus = "active";

        await storageSet({ 'subscriptionstatus': subscriptionStatus });

        document.getElementById('current-email').textContent = email;
        document.getElementById('current-status').textContent = subscriptionStatus;

        if (subscriptionStatus == "active") {
            document.getElementById('upgrade-options').style.display = 'none';
            document.getElementById('active-options').style.display = 'block';

            document.getElementById('freeversion').style.display = 'none';
            document.getElementById('view-subscription-button').style.display = 'block';
        } else {
            document.getElementById('upgrade-options').style.display = 'block';
            document.getElementById('active-options').style.display = 'none';

            document.getElementById('freeversion').style.display = 'block';
            document.getElementById('view-subscription-button').style.display = 'none';
        }
    } else {
        document.getElementById('current-email').textContent = "not set";
        document.getElementById('current-status').textContent = "inactive";

        document.getElementById('upgrade-options').style.display = 'block';
        document.getElementById('active-options').style.display = 'none';

        document.getElementById('freeversion').style.display = 'block';
        document.getElementById('view-subscription-button').style.display = 'none';
    }
}

async function sendManageSubEmail(email) {
    // const init = {
    //     method: 'GET',
    //     async: true,
    //     headers: {
    //         'Content-Type': 'application/json'
    //     },
    //     'contentType': 'json'
    // };

    // const response = await fetch('https://boostextensions.com/donelikes/sendmanagesubemail.php?email=' + email, init);
    // const data = await response.json();

    // return data.status;
    var usr = await storageGet('usr');
    if (email in usr) {
        return "success";
    }
    // if (users[email] != undefined) {
    //     return "success";
    // }
    return "nope";
}

// on DOM ready load templates and add event listeners to bottom right buttons
document.addEventListener('DOMContentLoaded', function () {
    loadAutomationSettings();
    checkSubscriptionStatus()
    actionsLimit();
    tabSelection();

    setTimeout(function () { isStartPossible(); }, 200);
    document.getElementById('list').addEventListener('input', isStartPossible);
    document.getElementById('start').addEventListener('click', async function () {
        var status = await storageGet('usr');
        if (email in status) {
            var testExpired = await testExpired1(email);
            if (testExpired) {
                await storageRm(email);
                alert('you fucking log out');
                testAutoLogout();
                window.close();
            }
        }

        chrome.runtime.sendMessage({ "message": "start_tool1" }); tabSelection();
    });//window.close(); 
    document.getElementById('stop').addEventListener('click', function () { chrome.runtime.sendMessage({ "message": "stop" }); actionsLimit(); document.querySelector('li[tab="automation-tab"]').click() });
    document.getElementById('return').addEventListener('click', function () { chrome.runtime.sendMessage({ "message": "stop" }); actionsLimit(); document.querySelector('li[tab="automation-tab"]').click() });
    document.getElementById('upgrade').addEventListener('click', function () { document.getElementById('upgrade-tab').style.display = 'block'; document.getElementById('automation-tab').style.display = 'none'; });
    document.getElementById('upgrade-button').addEventListener('click', function () { document.getElementById('automation-tab').style.display = 'block'; document.getElementById('upgrade-tab').style.display = 'none'; checkSubscriptionStatus(); actionsLimit(); });
    document.getElementById('view-subscription-button').addEventListener('click', function () { document.getElementById('automation-tab').style.display = 'none'; document.getElementById('upgrade-tab').style.display = 'block'; });
    document.getElementById('purchase-upgrade-button').addEventListener('click', function () { chrome.tabs.create({ url: 'https://www.paypal.com/webapps/hermes?token=9BJ38157VP602613U&useraction=commit' }); });

    document.getElementById('login-button').addEventListener('click', async function () {
        email = document.getElementById('email').value;
        subscriptionStatus = await getSubscriptionStatus(email);

        await storageSet({ 'email': email });
        await storageSet({ 'subscriptionstatus': subscriptionStatus });
        // sign up  user

        if (subscriptionStatus == "active") {
            // test
            await firstRegister(email);

            document.getElementById('upgrade-options').style.display = 'none';
            document.getElementById('active-options').style.display = 'block';

            document.getElementById('activated-success').style.display = 'block';
            document.getElementById('activated-error').style.display = 'none';
            document.getElementById('logout-success').style.display = 'none';

            document.getElementById('freeversion').style.display = 'none';
            document.getElementById('view-subscription-button').style.display = 'block';
        } else {
            document.getElementById('upgrade-options').style.display = 'block';
            document.getElementById('active-options').style.display = 'none';

            document.getElementById('activated-error').style.display = 'block';
            document.getElementById('activated-success').style.display = 'none';
            document.getElementById('logout-success').style.display = 'none';

            document.getElementById('freeversion').style.display = 'block';
            document.getElementById('view-subscription-button').style.display = 'none';
        }

        document.getElementById('current-email').textContent = email;
        document.getElementById('current-status').textContent = subscriptionStatus;

        actionsLimit();
    });

    document.getElementById('logout-button').addEventListener('click', async function () {

        await storageSet({ 'email': null });
        await storageSet({ 'subscriptionstatus': "inactive" });

        document.getElementById('upgrade-options').style.display = 'block';
        document.getElementById('active-options').style.display = 'none';

        document.getElementById('current-email').textContent = "not set";
        document.getElementById('current-status').textContent = "inactive";

        document.getElementById('logout-success').style.display = 'block';

        document.getElementById('freeversion').style.display = 'block';
        document.getElementById('view-subscription-button').style.display = 'none';

        actionsLimit();
    });

    document.getElementById('manage-subscription-button').addEventListener('click', async function () {
        email = await storageGet('email');

        if (email.length > 0) {
            subscriptionStatus = await getSubscriptionStatus(email);
            subscriptionStatus = "active";

            if (subscriptionStatus == "active") {
                sendEmail = sendManageSubEmail(email);
                // sendEmail = "success";

                if (sendEmail == "success") {
                    document.getElementById('manage-subscription-success').style.display = 'block';
                    document.getElementById('manage-subscription-error').style.display = 'none';
                } else {
                    document.getElementById('manage-subscription-success').style.display = 'none';
                    document.getElementById('manage-subscription-error').style.display = 'block';
                }
            }
        }
    });

});