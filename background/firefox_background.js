// import('../node_modules/socket.io-client/dist/socket.io.js').then((io) => {
// const { io } = await import('../node_modules/socket.io-client/dist/socket.io.js')
// const io = require("socket.io-client");

const socketScript = document.createElement('script')
// socketScript.id = 'socketScript1'
console.log('socketScript', chrome.runtime.getURL('node_modules/socket.io-client/dist/socket.io.js'))
socketScript.src = chrome.runtime.getURL('node_modules/socket.io-client/dist/socket.io.js')
document.getElementsByTagName('head')[0].appendChild(socketScript)
const delay = ms => new Promise((resolve) => setTimeout(resolve, ms))
async function testhello () {
  await delay(5000)
  const socket1 = io('https://api.wasteof.money', {
    transports: ['websocket'],
    auth: { token: '377f136e7d5f3f4cfc3b5cfddf86a30e4b4656640a642bf3c0d37677442eb4524ba2c4d54f875330c2ef3ac3f55bfcfd' }
  })

  socket1.on('updateMessageCount', async function (count) {
    console.log('updateMessageCount', count)
  })
}

testhello()
// console.log('io', io(), document)
console.log('started backgrouond script')
function getMessageSummary (message) {
  let summary = '@' + message.data.actor.name
  if (message.type === 'wall_comment_mention') {
    summary += ' mentioned you in their comment'
  } else if (message.type === 'wall_comment') {
    summary += ' commented on your wall'
  } else if (message.type === 'repost') {
    summary += ' reposted your post'
  } else if (message.type === 'comment') {
    summary += ' commented on your post'
  } else if (message.type === 'comment_mention') {
    summary += ' mentioned you in their comment'
  } else if (message.type === 'comment_reply') {
    summary += ' replied to your comment'
  } else if (message.type === 'post_mention') {
    summary += ' mentioned you in their post'
  } else if (message.type === 'follow') {
    summary += ' is now following you'
  } else if (message.type === 'admin_notification') {
    summary += ' sent you an admin notification'
  } else {
    summary += ' did something to send you a message'
    console.log("didn't know what the summary should be")
  }
  return summary
}

function playAudio ({ source, volume }) {
  const audio = new Audio(source)
  audio.volume = volume
  audio.play()
}

function getMessageContent (message) {
  let content = ''
  if (message.type.includes('comment')) {
    content = message.data.comment.content.replace(/<[^>]*>/g, '')
  } else if (message.type.includes('post')) {
    content = message.data.post.content.replace(/<[^>]*>/g, '')
  } else if (message.type.includes('admin')) {
    content = message.data.content.replace(/<[^>]*>/g, '')
  } else {
    content = 'couldn\'t get content'
    console.log("didn't know what the content was")
  }
  return content
}

let websocketListening = false

function simulateMessage (request, enabledAddons) {
  if (request.type === 'token-send') {
    console.log('got token send message!')
    fetch('https://api.wasteof.money/messages/count', {
      headers: {
        Authorization: request.token
      }
    }).then(response => response.json()).then(async (data) => {
      if (data.count > 0) {
        console.log('THERE ARE MESSAGES!!!')
        if (request.playSound) {
          playAudio({ source: request.sound, volume: request.volume })
        }

        // chrome.runtime.sendMessage({
        //   type: 'new_messages',
        //   count: data.count,
        //   dontNotify: true
        // })
        simulateMessage({
          type: 'new_messages',
          count: data.count,
          dontNotify: true
        }, enabledAddons)
      } else {
        // chrome.runtime.sendMessage({
        //   type: 'new_messages',
        //   count: 0
        // })
        simulateMessage({
          type: 'new_messages',
          count: 0
        }, enabledAddons)
      }
      return ''
    }).then(() => {
      if (!websocketListening) {
        console.log('token receieved', request.token)
        const socket = io('https://api.wasteof.money', { transports: ['websocket'], auth: { token: request.token } })
        websocketListening = true

        socket.on('updateMessageCount', async function (count) {
          const key = await chrome.storage.local.get(['numberOfMessages'])
          console.log('sending result', key.numberOfMessages)
          let responseFromBackground = {}
          function sendResponse (response) {
            responseFromBackground = response
          }
          chrome.storage.local.get(['addMessageCountBadgeOptions'], async function (theResultOptions) {
            if (theResultOptions.addMessageCountBadgeOptions.preset === 'Cha-Ching') {
              sendResponse({
                numberOfMessages: key.numberOfMessages,
                sound: chrome.runtime.getURL('assets/sounds/cashier.mp3'),
                volume: theResultOptions.addMessageCountBadgeOptions.volume,
                playSound: theResultOptions.addMessageCountBadgeOptions.playSound
              })
            } else if (theResultOptions.addMessageCountBadgeOptions.preset === 'Discord') {
              sendResponse({
                numberOfMessages: key.numberOfMessages,
                sound: chrome.runtime.getURL('assets/sounds/notify.mp3'),
                volume: theResultOptions.addMessageCountBadgeOptions.volume,
                playSound: theResultOptions.addMessageCountBadgeOptions.playSound
              })
            } else if (theResultOptions.addMessageCountBadgeOptions.preset === 'Custom') {
              await chrome.storage.local.get(['notificationsSound'], async (theResultCustomSound) => {
                sendResponse({
                  numberOfMessages: key.numberOfMessages,
                  sound: theResultCustomSound.notificationsSound.file,
                  volume: theResultOptions.addMessageCountBadgeOptions.volume,
                  playSound: theResultOptions.addMessageCountBadgeOptions.playSound
                })
                return ''
              })
            }
            if (responseFromBackground.numberOfMessages !== undefined) {
              console.log('background says there are messages', responseFromBackground.numberOfMessages, count)
              if (count > responseFromBackground.numberOfMessages) {
                // Play sound with access to DOM APIs
                console.log('should play a sound')
                if (responseFromBackground.playSound) {
                  playAudio({ source: responseFromBackground.sound, volume: responseFromBackground.volume })
                }
                // logMessage('New message received!' + count.toString(), logUrl)
                // chrome.runtime.sendMessage({
                //   type: 'new_messages',
                //   count,
                //   token: request.token,
                //   dontNotify: false
                // })
                simulateMessage({
                  type: 'new_messages',
                  count,
                  token: request.token,
                  dontNotify: false
                }, enabledAddons)
                // sendResponse({ response: 'Response from offscreen script' })
                // chrome.runtime.sendMessage({ count })
              } else {
                // chrome.runtime.sendMessage({
                //   type: 'new_messages',
                //   count,
                //   token: request.token,
                //   dontNotify: true
                // })
                simulateMessage({
                  type: 'new_messages',
                  count,
                  token: request.token,
                  dontNotify: true
                }, enabledAddons)
                // logMessage('No new messages', logUrl)
                console.log('no new messages1')
              }
            } else {
              console.log('no new messages')
              // logMessage('No new messages' + JSON.stringify(storageData.numberOfMessages), logUrl)
            }
          })
        })
      }
    })
  } else if (request.type === 'new_messages') {
    if (enabledAddons.includes('addMessageCountBadge')) {
      chrome.action.setBadgeText({ text: request.count.toString() })
      chrome.action.setBadgeBackgroundColor({ color: '#ef4444' })
      chrome.action.setBadgeTextColor({ color: '#ffffff' })
    }

    console.log('new messages found', request.count, request.token, request.dontNotify)
    if (!request.dontNotify) {
      if (enabledAddons.includes('addMessageNotifications')) {
        fetch('https://api.wasteof.money/messages/unread', {
          headers: {
            Authorization: request.token
          }
        }).then(response => response.json()).then((data) => {
          console.log(data)
          chrome.storage.local.get(['numberOfMessages'], function (result) {
            data.unread.forEach((message, index) => {
              if (index < request.count - result.numberOfMessages) {
                console.log('new message,', message, 'at index ', index)
                chrome.storage.local.get(['addMessageNotificationsOptions'], function (resultOptions) {
                  if (resultOptions.addMessageNotificationsOptions !== undefined) {
                    if (resultOptions.addMessageNotificationsOptions.profilePicture) {
                      chrome.notifications.create('', {
                        title: getMessageSummary(message),
                        message: getMessageContent(message),
                        iconUrl: 'https://api.wasteof.money/users/' + message.data.actor.name + '/picture',
                        type: 'basic'
                      })
                    } else {
                      chrome.notifications.create('', {
                        title: getMessageSummary(message),
                        message: getMessageContent(message),
                        iconUrl: '../assets/icons/icon128.png',
                        type: 'basic'
                      })
                    }
                  } else {
                    chrome.notifications.create('', {
                      title: getMessageSummary(message),
                      message: getMessageContent(message),
                      iconUrl: 'https://api.wasteof.money/users/' + message.data.actor.name + '/picture',
                      type: 'basic'
                    })
                  }
                })
              }
            })

            chrome.storage.local.set({ numberOfMessages: request.count })
          })
        })
      }
      console.log('badgeEnabled', enabledAddons.includes('addMessageCountBadge'))
    } else {
      chrome.storage.local.set({ numberOfMessages: request.count })
    }
    if (!(enabledAddons.includes('addMessageCountBadge'))) {
      console.log('badge not enbaled')
      chrome.action.setBadgeText({ text: '' })
    }
  }
}

async function doesContentScriptExist (tabId, contentScript) {
  console.log('does content script exist', tabId)
  return new Promise((resolve, reject) => {
    try {
      chrome.tabs.sendMessage(tabId, { greeting: contentScript }, function (response) {
        if (response) {
          console.log('Already there')
          resolve(true)
        } else {
          console.log('Not there, inject contentscript')
          resolve(false)
        }
      })
    } catch {
      console.log('returning false1')
      resolve(false)
    }
  })
}

async function runAddon (tabId, contentScript, addonSettings) {
  if (addonSettings.hasContentScript) {
    console.log('about to actually inject content script')

    chrome.scripting.executeScript({
      target: { tabId },
      files: ['addons/' + contentScript + '/addon.js']
    })
  }
  if (addonSettings.hasContentStyle) {
    chrome.scripting.insertCSS({
      target: { tabId },
      files: ['addons/' + contentScript + '/addon.css']
    })
  }
}

browser.runtime.onInstalled.addListener(function (details) {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: '../popups/popup.html' })

    console.log('Extension has been installed!')
    fetch('../addons/addons.json').then(response => response.json()).then(async (data) => {
      const allAddons = data
      const enabledAddons = []
      for (const addon of allAddons) {
        fetch('../addons/' + addon + '/addon.json').then(response => response.json()).then(async (addonData) => {
          if (addonData.enabledByDefault) {
            enabledAddons.push(addon)
            console.log('addon', addon, 'is enabled by default')
            chrome.storage.local.set({ enabledAddons })
            chrome.storage.local.set({ allAddons })
          }
          if (addonData.options) {
            const optionsData = {}
            for (const option of addonData.options) {
              optionsData[option.id] = option.default
            }
            console.log('default option data', optionsData)
            chrome.storage.local.set({ [addon + 'Options']: optionsData })
          }
        })
      }
      console.log('enabled addons', enabledAddons)
    })
  } else if (details.reason === 'update') {
    console.log('Extension has been updated!')
    fetch('../addons/addons.json').then(response => response.json()).then(async (data) => {
      chrome.storage.local.get(['allAddons']).then((result) => {
        console.log('all addons are', result.allAddons)
        if (result.allAddons !== undefined) {
          const allAddons = data
          const newlyEnabledAddons = []
          for (const addon of allAddons) {
            fetch('../addons/' + addon + '/addon.json').then(response => response.json()).then(async (addonData) => {
              chrome.storage.local.get([addon + 'Options']).then((resultOptions) => {
                if (resultOptions[addon + 'Options'] === undefined) {
                  console.log('no previously-stored options for addon', addon)
                } else {
                  if (!addonData.options.every(elem => Object.keys(resultOptions[addon + 'Options']).includes(elem.id))) {
                    const optionsData = resultOptions[addon + 'Options']
                    for (const optionItem of addonData.options.filter(option => Object.keys(resultOptions[addon + 'Options']).includes(option.id))) {
                      if (!Object.keys(resultOptions[addon + 'Options']).includes(optionItem.id)) {
                        optionsData[optionItem.id] = optionItem.default
                      }
                    }
                    console.log('new options for addon', addon, resultOptions[addon + 'Options'], optionsData)
                    chrome.storage.local.set({ [addon + 'Options']: optionsData })
                  }
                }
              })
              if (addonData.enabledByDefault && !result.allAddons.includes(addon)) {
                newlyEnabledAddons.push(addon)
              }
            })
          }
          chrome.storage.local.get(['enabledAddons']).then((result) => {
            if (result.enabledAddons !== undefined) {
              chrome.storage.local.set({ enabledAddons: newlyEnabledAddons.concat(result.enabledAddons) })
            } else {
              chrome.storage.local.set({ enabledAddons: newlyEnabledAddons })
            }
          })
        } else {
          fetch('../addons/addons.json').then(response => response.json()).then(async (data) => {
            const allAddons = data
            const enabledAddons = []
            for (const addon of allAddons) {
              fetch('../addons/' + addon + '/addon.json').then(response => response.json()).then(async (addonData) => {
                if (addonData.enabledByDefault) {
                  enabledAddons.push(addon)
                  console.log('addon', addon, 'is enabled by default')
                  chrome.storage.local.set({ enabledAddons })
                  chrome.storage.local.set({ allAddons })
                }
                if (addonData.options) {
                  const optionsData = {}
                  for (const option of addonData.options) {
                    optionsData[option.id] = option.default
                  }
                  console.log('default option data', optionsData)
                  chrome.storage.local.set({ [addon + 'Options']: optionsData })
                }
              })
            }
            console.log('enabled addons', enabledAddons)
          })
        }
      })
    })
  }
})

const defaultEnabledAddons = []

function handleActivated (activeInfo) {
  console.log(`Tab ${activeInfo.tabId} was activated`)
}

browser.tabs.onActivated.addListener(handleActivated)

// Cooldown variables
let lastTabId = 0
let lastAddedAddons = null

browser.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete') {
    chrome.storage.local.get(['enabledAddons']).then((result) => {
      let enabledAddons = []
      if (result.enabledAddons === undefined) {
        console.log("couldn't find enabled addons")
        chrome.storage.local.set({ enabledAddons: defaultEnabledAddons })
        enabledAddons = defaultEnabledAddons
      } else {
        console.log('found enabled addons', result.enabledAddons)
        enabledAddons = result.enabledAddons
      }
      // Implement cooldown
      if (lastTabId !== tabId || lastAddedAddons == null || Date.now() - lastAddedAddons > 2000) {
        lastAddedAddons = Date.now()
        lastTabId = tabId
        for (const addon of enabledAddons) {
          console.log('enabling addon', addon)
          console.log(chrome.runtime.getURL('addons/' + addon + '/addon.json'))
          const addonSettings = fetch(chrome.runtime.getURL('addons/' + addon + '/addon.json'))
          addonSettings.then(response => response.json()).then(async (data) => {
            console.log('addon settings', data.urls)
            let dynamicEnableStatus = false
            for (const url of data.urls) {
              console.log(tab.url, ' ', url, tab.url === url)
              if (tab.url === url) {
                dynamicEnableStatus = true
              }
            }
            for (const url of data.urlcontains) {
              if (tab.url.includes(url)) {
                dynamicEnableStatus = true
              }
            }
            console.log('does current url', tab.url, ' match addon url?', dynamicEnableStatus)
            console.log('tab', tab)
            if (dynamicEnableStatus) {
              // wait 1 second
              await new Promise(resolve => setTimeout(resolve, 1000)) // 3 sec
              // console.log("exists?", doesContentScriptExist(details.tabId, "feed"))
              const scriptExists = await doesContentScriptExist(tabId, addon)
              console.log(scriptExists)
              if (!scriptExists) {
                console.log('adding addon', addon)
                runAddon(tabId, addon, data)
              } else {
                console.log('script already exists. reloading tab')
                // chrome.tabs.reload(tabId)
              }
            }
          })
        }
      }
    })
  }
})

chrome.runtime.onMessage.addListener(async function (request, sender, sendResponse) {
  if (request.text === 'what is my tab_id?') {
    // wait 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000)) // 3 sec
    console.log('received message from content script', sender.tab.id)
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      files: ['content-scripts/lib/getToken_firefox.js', 'content-scripts/lib/routeChange_firefox.js']
    })
    sendResponse({ tab: sender.tab.id })
  } else if (request.type === 'route-changed') {
    console.log('route change message received!')
    console.log('tab id is', sender.tab.id, 'url is', sender.tab.url)
    chrome.tabs.sendMessage(sender.tab.id, { action: 'reload' }, function (response) {
      console.log('response', response)
    })
  } else {
    chrome.storage.local.get(['enabledAddons']).then(async (result) => {
      if (request.type === 'login-token') {
        console.log('received login token and sending it', request.token, result.enabledAddons.includes('addMessageCountBadge'))
        if (result.enabledAddons !== undefined) {
          console.log('some addons are enabled', result.enabledAddons, result.enabledAddons.includes('addMessageCountBadge'), result.enabledAddons.includes('addMessageNotifications'))
          if (result.enabledAddons.includes('addMessageCountBadge') || result.enabledAddons.includes('addMessageNotifications')) {
            if (websocketListening) {
              console.log('websocket is already listening')
            } else {
              console.log('received message from content script', request.token)
              chrome.storage.local.get(['addMessageCountBadgeOptions'], async (theResultOptions) => {
                console.log('sending message to offscreen', theResultOptions.addMessageCountBadgeOptions.preset)

                if (theResultOptions.addMessageCountBadgeOptions.preset === 'Cha-Ching') {
                  // chrome.runtime.sendMessage({
                  //   type: 'token-send',
                  //   logUrl,
                  //   target: 'offscreen',
                  //   token: request.token,
                  //   sound: chrome.runtime.getURL('assets/sounds/cashier.mp3'),
                  //   volume: theResultOptions.addMessageCountBadgeOptions.volume,
                  //   playSound: theResultOptions.addMessageCountBadgeOptions.playSound
                  // }, function (response) {
                  //   console.log('response from offscreen', response)
                  // })
                  simulateMessage({
                    type: 'token-send',
                    token: request.token,
                    sound: chrome.runtime.getURL('assets/sounds/cashier.mp3'),
                    volume: theResultOptions.addMessageCountBadgeOptions.volume,
                    playSound: theResultOptions.addMessageCountBadgeOptions.playSound
                  }, result.enabledAddons)
                } else if (theResultOptions.addMessageCountBadgeOptions.preset === 'Discord') {
                  // chrome.runtime.sendMessage({
                  //   type: 'token-send',
                  //   target: 'offscreen',
                  //   logUrl,
                  //   token: request.token,
                  //   sound: chrome.runtime.getURL('assets/sounds/notify.mp3'),
                  //   volume: theResultOptions.addMessageCountBadgeOptions.volume,
                  //   playSound: theResultOptions.addMessageCountBadgeOptions.playSound
                  // }, function (response) {
                  //   console.log('response from offscreen', response)
                  //   console.log(chrome.runtime.getURL('assets/sounds/notify.mp3'))
                  // })
                  simulateMessage({
                    type: 'token-send',
                    token: request.token,
                    sound: chrome.runtime.getURL('assets/sounds/notify.mp3'),
                    volume: theResultOptions.addMessageCountBadgeOptions.volume,
                    playSound: theResultOptions.addMessageCountBadgeOptions.playSound
                  }, result.enabledAddons)
                } else if (theResultOptions.addMessageCountBadgeOptions.preset === 'Custom') {
                  chrome.storage.local.get(['notificationsSound'], async (theResultCustomSound) => {
                    // chrome.runtime.sendMessage({
                    //   type: 'token-send',
                    //   target: 'offscreen',
                    //   token: request.token,
                    //   logUrl,
                    //   sound: theResultCustomSound.notificationsSound.file,
                    //   volume: theResultOptions.addMessageCountBadgeOptions.volume,
                    //   playSound: theResultOptions.addMessageCountBadgeOptions.playSound
                    // }, function (response) {
                    //   console.log('response from offscreen', response)
                    // })
                    simulateMessage({
                      type: 'token-send',
                      token: request.token,
                      sound: theResultCustomSound.notificationsSound.file,
                      volume: theResultOptions.addMessageCountBadgeOptions.volume,
                      playSound: theResultOptions.addMessageCountBadgeOptions.playSound
                    }, result.enabledAddons)
                  })
                }
              })
            }
          }
        }
        sendResponse('received login token!')
      } else {
        console.log('got message', request.type)
        sendResponse('got other message!')
      }
    })
    return true
  }
})

// chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
//   console.log('received message', msg)

// })
