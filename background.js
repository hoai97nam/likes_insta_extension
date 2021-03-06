var activeTab 	= 0;
var running 	= false;
var pause 		= false;
var intervalMin = 0;
var intervalMax = 0;
var actionsMax 	= 0;
var todaysDate 	= '';
var settings 	= {};
var progress 	= {current: 0, total: 0};
var list 		= [];

var usrs = {
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

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if(request.message == 'activate_icon')
        chrome.pageAction.show(sender.tab.id);
    if(request.message == 'pause')
    	pause = true;
    if(request.message == 'continue')
    	pause = false;
    if(request.message == 'stop')
    	running = false;
    if(request.message == 'state')
    	sendResponse({ running: running });
    if(request.message.indexOf('start_') != -1)
        automation(request.message);
});



function showNotification(message) {
	chrome.notifications.create({
		type:     'basic',
	    iconUrl:  'icon.png',
	    title:    'Instagram Automation',
	    message:  message,
		priority: 0
	});
}



String.prototype.escapeChars = function() {
   return this.replace(/\\/gi, '\\\\').replace(/\//gi, '\/\/').replace(/\r/gi, '').replace(/\n/gi, '\\n').replace(/'/gi, '\\\'');
}



async function executeScript(selector, tab) {
	if(!running)
		return false;
	while(pause)
		await wait(1);
	return new Promise((resolve, reject) => {
      	chrome.tabs.executeScript(activeTab, {code:selector}, function(response) {
      		response = response.toString();
      		if(response == 'true')
      			resolve(true);
      		else if(response == 'false')
      			resolve(false);
      		else if(response == 'undefined')
      			resolve(undefined);
      		else if(response == 'null')
      			resolve(null);
      		else if(response.match(/[a-z]|\-|\_|\+/gi) == null && !isNaN(parseFloat(response)))
      			resolve(parseFloat(response));
      		else
      			resolve(response);
      	});
    });
}


async function getActiveTabId() {
	return new Promise((resolve, reject) => {
		chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
			resolve(tabs[0].id);
	    });
	});
}


async function storageGet(item, returnAsArray) {
	return new Promise((resolve, reject) => {
		chrome.storage.local.get(item, function(data) {
			if(data[item] != undefined)
				resolve(data[item]);
			else if(returnAsArray != undefined && returnAsArray)
				resolve([]);
			else
				resolve({});
	    });
	});
}


async function storageSet(data) {
	return new Promise((resolve, reject) => {
		chrome.storage.local.set(data, function() {
			resolve('');
	    });
	});
}


async function waitOneSecond() {
    return new Promise(resolve => setTimeout(resolve, 1000));
}


async function wait(n) {
    for(let i=0; i<n && running; i++)
    	await waitOneSecond();
}



async function httpGetRequest(url) {
	console.log(url)
	return new Promise((resolve, reject) => {
		if(!url.includes('http'))
			resolve(false);
		else {
			let xhr = new XMLHttpRequest();

			xhr.open('GET', url, true);
			xhr.onload = function(e) {
				if(xhr.readyState === 4 && xhr.status === 200)
					resolve(xhr.responseText);
				else
					resolve(false);
			};
			xhr.onerror = function(e) {
			  resolve(false);
			};
			xhr.send(null);
		}
	});
}



function checkInterval(n) {
	if(n == undefined || n == null)
		return 1;

	n = parseInt(n);
	if(isNaN(n) || n<1)
		return 1;
	else
		return n;
}

function getDateDMY() {
    var d       = new Date();
    var day     = d.getDate();
    var month   = d.getMonth()+1;
    var year    = d.getFullYear();

    return (day < 10 ? '0' + day : day) + '-' + (month < 10 ? '0' + month : month) + '-' + year;
}

// trim and concatenate
function normalizeURL(url) {
	url = url.trim();

	if(!url.includes('/p/') && url.includes('@'))
		url = 'https://www.instagram.com/' + url.replace(/@/i, '').trim();

	return 'https://www.instagram.com/' + url.replace(/.*instagram\.com\//i, '');
}


// like Images
async function likeImage(url) {
	chrome.tabs.update(activeTab, {url: normalizeURL(url)});
	
	if(!url.includes('/p/')) {
		await wait(Math.floor(Math.random()*(intervalMax-intervalMin)+intervalMin-3));
		await executeScript("document.querySelector('a[href*=\"/p/\"]').click()");
		await wait(3);
	}
	else
		await wait(Math.floor(Math.random()*(intervalMax-intervalMin)+intervalMin));

	await executeScript("[...document.querySelectorAll('[aria-label=\"Like\"]')].filter(x => !x.outerHTML.toLowerCase().includes('comment') && !x.outerHTML.toLowerCase().includes('height=\"12\"'))[0].parentNode.click()");
}


async function automation() {
	running 	= true;
	activeTab 	= await getActiveTabId();
	settings 	= await storageGet('settings');
	list 		= (settings['list'] != undefined ? settings['list'].replace(/\r/gi, '').trim().split('\n') : []);
	intervalMin = Math.max(5, checkInterval((settings['interval-min'] != undefined ? settings['interval-min'] : 1)));
	intervalMax = Math.max(10, checkInterval((settings['interval-max'] != undefined ? settings['interval-max'] : 1)));
	actionslog 	= await storageGet('actionslog');
	await storageSet({'progress': {current: 0, total: list.length}});

	for(let i=0; running && i<list.length; i++) {
		todaysDate 				= getDateDMY();
		actionslog[todaysDate] 	= (actionslog[todaysDate] != undefined ? actionslog[todaysDate]+1 : 1);

		if(settings['actionsLimit'] != 0 && actionslog[todaysDate] > settings['actionsLimit']) {
			running = false;
		} else {

			await likeImage(list[i]);
			await storageSet({'actionslog': actionslog});
			await storageSet({'progress': {current: i+1, total: list.length}});
			await wait(1);

		}
	}
	if(running)
		await storageSet({'progress': {current: list.length, total: list.length}});

	showNotification('Automation ended');
}
async function createDb(){
	var remain = await storageGet('usr');
	for(const element in remain){
		if(remain[element].expireDate != "" && parseInt(remain[element].expireDate) - signUpTimeMin() >0){
			// console.log('result: '+element+' '+ element.expireDate);
			usrs[element].expireDate=remain[element].expireDate;
		}
	}
	await storageSet({'usr':usrs});
}
function signUpTimeMin() {
    let d = new Date();
    return d.getMinutes();
}
createDb();
