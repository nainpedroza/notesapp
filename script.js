//localStorage.clear();
//pubsub
const pubsub = {};
(function (myObject) {
  const topics = {}
  let subUid = -1
  myObject.publish = function (topic, args) {
    if (!topics[topic]) {
      return false
    }
    const subscribers = topics[topic]
    let len = subscribers ? subscribers.length : 0
    while (len--) {
      subscribers[len].func(topic, args)
    }
    return this
  }
  myObject.subscribe = function (topic, func) {
    if (!topics[topic]) {
      topics[topic] = []
    }
    const token = (++subUid).toString()
    topics[topic].push({
      token: token,
      func: func
    })
    return token
  }
  myObject.unsubscribe = function (token) {
    for (const m in topics) {
      if (topics[m]) {
        for (let i = 0, j = topics[m].length; i < j; i++) {
          if (topics[m][i].token === token) {
            topics[m].splice(i, 1)
            return token
          }
        }
      }
    }
    return this
  }
}(pubsub))

//Colors and rotations to make it look like real notes
var random_margin = ["3px"];
var random_colors = ["#c2ff3d","#ff3de8","#3dc2ff","#04e022","#bc83e6","#ebb328"];
var random_degree = ["rotate(3deg)", "rotate(1deg)", "rotate(-1deg)", "rotate(-3deg)", "rotate(-5deg)", "rotate(-8deg)"];
//Manipulate content
const storedInfo = 'info'
const storedCommands = 'commands'
function Model () {
  function getData (index = storedInfo, active = true) {
    if (index === storedInfo && active) {
      const strData = localStorage.getItem(storedInfo)
      const data = JSON.parse(strData)
      const activeNotes = {}
      for (const i in data) {
        if (data[i].active && data[i].passFilter) {
          activeNotes[i] = data[i]
        }
      }
      return activeNotes
    } else if (index === storedInfo && !active) {
      const strData = localStorage.getItem(storedInfo)
      const data = JSON.parse(strData)
      return data
    }
    const strData = localStorage.getItem(storedCommands)
    const commands = JSON.parse(strData)
    return commands
  }
  function storeSettings (inverse) {
    const strCommands = localStorage.getItem(storedCommands) || '[]'
    const commands = JSON.parse(strCommands)
    commands.push(inverse)
    const newCommands = JSON.stringify(commands)
    localStorage.setItem(storedCommands, newCommands)
  }
  function saveNoteInfo (obj) {
    const strData = localStorage.getItem(storedInfo)
    let data = JSON.parse(strData)
    if (data) {
      data.push(obj)
    } else {
      data = [obj]
    }
    localStorage.setItem(storedInfo, JSON.stringify(data))
  }
  function updateData (id, filter, index = storedInfo) {
    if (index === storedCommands) {
      const commands = filter.commands
      localStorage.setItem(storedCommands, JSON.stringify(commands))
      return
    }
    const strData = localStorage.getItem(storedInfo)
    let data = JSON.parse(strData)
    let updNote = [false, '']
    if ('note' in filter) {
      if (filter.note !== data[id].note) {
        updNote = [true, data[id].note]
        data[id].note = filter.note
        data[id].lastMDate = filter.lastMDate.toString()
      }
    } else if ('data' in filter) {
      data = filter.data
    } else {
      for (const key in filter) {
        data[id][key] = filter[key]
      }
    }
    localStorage.setItem(storedInfo, JSON.stringify(data))
    return updNote
  }
  function updateNotes (data) {
    localStorage.setItem(storedInfo, JSON.stringify(data))
  }
  
  class ModelNote {
    constructor (note) {
      var d = new Date(),
      minutes = d.getMinutes().toString().length == 1 ? '0'+d.getMinutes() : d.getMinutes(),
      hours = d.getHours().toString().length == 1 ? '0'+d.getHours() : d.getHours(),
      ampm = d.getHours() >= 12 ? 'pm' : 'am',
      months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
      days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      d = days[d.getDay()]+' '+months[d.getMonth()]+' '+d.getDate()+' '+d.getFullYear()+' '+hours+':'+minutes+ampm;
      this.createDate = d
      this.lastMDate = d
      this.note = note
      this.active = true
      this.passFilter = true
    }
  }
  class ModelFactory {
    constructor() {}
    createNote(note) {
      return new ModelNote(note);
    }
  }
  const noteFactory = new ModelFactory()

  function undo () {
    const commands = getData(storedCommands)
    const data = getData(storedInfo, false)
    if (!data) {
      return
    }
    if (commands.length > 0) {
      const reverseCommand = commands.pop()
      let id = reverseCommand.id || ''
      switch (reverseCommand.command) {
        case 'updateNote':
          const note = reverseCommand.text
          updateNote(note, id, true)
          updateData('-1', { commands: commands }, storedCommands)
          break
        case 'saveNote':
          data.pop()
          updateData('-1', { data: data }, storedInfo)
          updateData('-1', { commands: commands }, storedCommands)
          break
        case 'deleteNote':
          updateData(id, { active: true })
          updateData('-1', { commands: commands }, storedCommands)
          break
        case 'swap':
          swapNotes(reverseCommand.start, reverseCommand.end, true)
          updateData('-1', { commands: commands }, storedCommands)
          break
        default:
          break
      }
    }
  }

  function deleteNote (id) {
    updateData(id, { active: false })
    const inverse = { command: 'deleteNote', id: id }
    storeSettings(inverse)
  }

  function saveNote (note) {
    const obj = noteFactory.createNote(note)
    if (obj.note !== '') {
      saveNoteInfo(obj)
      const inverse = { command: 'saveNote' }
      storeSettings(inverse)
    }
  }

  function updateNote (note, id, reversing = false) {
    if (note) {
      const d = new Date()
      const filter = { note: note, lastMDate: d }
      const updNote = updateData(id, filter)
      if (!reversing) {
        if (updNote[0]) {
          const inverse = { id: id, command: 'updateNote', text: updNote[1] }
          storeSettings(inverse)
        }
      }
    }
  }

  function getDate (id, opt) {
    let d
    const data = getData(storedInfo, true)
    if (opt === 'c') {
      d = data[id].createDate
    } else if (opt === 'm') {
      d = data[id].lastMDate
    }
    return d
  }

  function filterNotes (filter) {
    const data = getData(storedInfo, false)
    for (const i in data) {
      if (data[i].note.includes(filter)) {
        data[i].passFilter = true
      } else {
        data[i].passFilter = false
      }
    }
    updateNotes(data)
  }

  function swapNotes (startId, endId, reversing = false) {
    const data = getData(storedInfo, false)
    const keepingNote = data[startId]
    data[startId] = data[endId]
    data[endId] = keepingNote
    if (!reversing) {
      const inverse = { command: 'swap', start: endId, end: startId }
      storeSettings(inverse)
    }
    updateNotes(data)
  }
  return {
    saveNote: saveNote,
    deleteNote: deleteNote,
    updateNote: updateNote,
    getDate: getDate,
    filterNotes: filterNotes,
    swapNotes: swapNotes,
    undo: undo,
    getNotes: getData
  }
}

// Presenter for manipulating and viewing the content
class Presenter {
  constructor (pubsub) {
    pubsub.publish('getDataPresenter',this)  
    this.pubsub = pubsub
    this.creationDate
    this.lastMDate
  }

  saveNote (note) {
    this.pubsub.publish('saveNotePresenter', note)
    this.pubsub.publish('getDataPresenter',this)  
  }

  editNote (note, id) {
    this.pubsub.publish('editNotePresenter', [note,id])
    this.pubsub.publish('getDataPresenter',this)  
  }

  deleteNote (id) {
    this.pubsub.publish('deleteNotePresenter', id)
    this.pubsub.publish('getDataPresenter',this)  
  }

  dates (id) {
    this.pubsub.publish('getDatesPresenter',[this,id])
    return {
      creation: this.creationDate,
      modification: this.lastMDate
    }
  }

  filterNotes (filter) {
    this.pubsub.publish('filterNotesPresenter',filter)
    this.pubsub.publish('getDataPresenter',this)
  }

  swapNotes (startId, endId) {
    this.pubsub.publish('interchageNotesPresenter', [startId,endId])
    this.pubsub.publish('getDataPresenter',this)
  }

  undo () {
    this.pubsub.publish('undoPresenter')
    this.pubsub.publish('getDataPresenter',this)
  }

  start(){
    pubsub.publish('startApp', this.data)
  }
}
// Manipulating the DOM elements
function View (pubsub) {
  const searchNote = document.querySelector('#findNote')
  const datesInfo = document.querySelector('.dates')
  const textSpace = document.getElementsByName('notearea')[0]
  const saveButton = document.querySelector('.savebutton')
  const editButton = document.querySelector('.editbutton')
  const cancelButton = document.querySelector('.cancelbutton')
  const noteContainer = document.querySelector('.item-container')
  const creationDP = document.querySelector('.creation')
  const lastMDP = document.querySelector('.modified')
  const undoButton = document.querySelector('.undobutton')
  function notifyChangeBox () {
    const filter = searchNote.value
    pubsub.publish('newText', filter)
  };

  function start (activeNotes) {
    noteContainer.addEventListener('click', clickOnNote)
    noteContainer.addEventListener('dragstart', onDrag)
    noteContainer.addEventListener('dragend', onDragEnd)
    noteContainer.addEventListener('dragover', function (event) {
      event.preventDefault()
    })
    noteContainer.addEventListener('drop', onDrop)
    searchNote.addEventListener('keyup', notifyChangeBox)
    saveButton.addEventListener('click', saveNote)
    saveButton.addEventListener('keydown', pressedKeyboard)
    undoButton.addEventListener('click', undo)
    document.addEventListener('keydown', pressedKeyboard)
    notifyChangeBox(activeNotes)
  }

  function clickOnNote (ev) {
    const clicked = ev.target
    const clickedClass = clicked.getAttribute('class')
    let id = clicked.getAttribute('id')
    switch (clickedClass) {
      case 'view':
        pubsub.publish('viewClicked', id)
        break
      case 'edit':
        pubsub.publish('editClicked', id)
        break
      case 'remove':
        pubsub.publish('deleteNote', id)
        break
    }
  }
  function editConf (note, dates, id) {
    searchNote.style.display = 'none'
    datesInfo.style.display = 'inline'
    textSpace.readOnly = false
    saveButton.style.display = 'none'
    editButton.style.display = 'inline'
    editButton.textContent = 'Save the changes'
    cancelButton.style.display = 'inline'
    cancelButton.textContent = 'Cancel'
    undoButton.style.display = 'none'
    noteContainer.style.display = 'none'
    textSpace.value = note
    editButton.addEventListener('click', onEditButton, { once: true })
    const creationDate = dates.creation
    const lastMDate = dates.modification
    creationDP.textContent = `Created: ${creationDate}.`
    lastMDP.textContent = `Last modification: ${lastMDate}`
    cancelButton.addEventListener('click', onCancelButton, { once: true })
    function onCancelButton () {
      editButton.removeEventListener('click', onEditButton, { once: true })
      editNote(id, true).saveEdition()
    }
    function onEditButton () {
      cancelButton.removeEventListener('click', onCancelButton, { once: true })
      editNote(id).saveEdition()
    }
  }
  function mainConf (activeNotes) {
    searchNote.style.display = 'inline'
    datesInfo.style.display = 'none'
    textSpace.setAttribute('placeholder', 'Write a note here.')
    textSpace.readOnly = false
    textSpace.value = ''
    saveButton.style.display = 'inline'
    saveButton.textContent = 'Save'
    editButton.style.display = 'none'
    cancelButton.style.display = 'none'
    noteContainer.style.display = 'block'
    undoButton.style.display = 'inline-block'
    placeNotes(activeNotes)
    cancelButton.removeEventListener('click', mainConf, { once: true })
  }

  function editNote (id, checkCancel = false) {
    return {
      saveEdition: () => {
        pubsub.publish('saveEditClicked',[id,checkCancel])
      }
    }
  }

  function saveEdition(newNote, id, activeNotes, checkCancel){
    if (!checkCancel) {
        newNote = textSpace.value
    } 
    activeNotes[id]['note'] = newNote
    pubsub.publish('editNote', [newNote, id])
    mainConf(activeNotes)
  }

  function viewConf (id, note, dates) {
    searchNote.style.display = 'none'
    datesInfo.style.display = 'inline'
    textSpace.readOnly = true
    saveButton.style.display = 'none'
    editButton.style.display = 'inline'
    editButton.textContent = 'Back to notes'
    cancelButton.style.display = 'none'
    noteContainer.style.display = 'none'
    textSpace.value = note
    const creationDate = dates.creation
    const lastMDate = dates.modification
    editButton.addEventListener('click', editNote(id).saveEdition, { once: true })
    creationDP.textContent = `Created: ${creationDate}.`
    lastMDP.textContent = `Last modification: ${lastMDate}`
    undoButton.style.display = 'none'
  }

  function currentNote (id, activeNotes) {
    const temp = document.querySelector('#notes')
    const li = temp.content.querySelector('.notesWrapper')
    li.setAttribute('id', id)
    let colorPicker = id % 6
    li.setAttribute("style", `margin:${random_margin[Math.floor(Math.random() * random_margin.length)]}; background-color:${random_colors[colorPicker]}; transform:${random_degree[Math.floor(Math.random() * random_degree.length)]}`);
    const p = li.querySelector('p')
    p.setAttribute('id', id)
    const buttons = li.querySelector('.buttons')
    buttons.setAttribute('id', id)
    const erraseB = buttons.querySelector('.remove')
    erraseB.setAttribute('id', id)
    const editB = buttons.querySelector('.edit')
    editB.setAttribute('id', id)
    const viewB = buttons.querySelector('.view')
    viewB.setAttribute('id', id)
    const noteData = activeNotes[id]
    p.textContent = noteData.note;
    const a = document.importNode(li, true)
    return a
  }

  function viewFactory () {
    function createNote (id, activeNotes) {
      return currentNote(id, activeNotes)
    }
    return { createNote: createNote }
  }

  function placeNotes (activeNotes) {
    noteContainer.innerHTML = ''
    const fragment = document.createDocumentFragment()
    for (const i of Object.keys(activeNotes).reverse()) {
      const j = parseInt(i)
      const currentNote = viewFactory().createNote(j, activeNotes)
      fragment.appendChild(currentNote)
    }
    noteContainer.appendChild(fragment)
  }

  function saveNote () {
    const note = textSpace.value
    pubsub.publish('saveNote', note)
  }
  function onDrag (event) {
    draggingNote = event.target
    draggingNote.style.opacity = 0.3
  }
  function onDragEnd (event) {
    draggingNote.style.opacity = 1
  }
  function onDrop (event) {
    const startId = draggingNote.getAttribute('id')
    const endId = event.target.getAttribute('id')
    pubsub.publish('swapNotes', [startId, endId])
  }
  function undo () {
    if (undoButton.style.display !== 'none') {
      pubsub.publish('undo')
      
    }
  }

  function pressedKeyboard (event) {
    if (event.ctrlKey && (event.key === 'z' || event.key === 'Z')) {
      undo()
    }
  }
  return {
    main: mainConf,
    edit: editConf,
    view: viewConf,
    start: start,
    saveEdition:saveEdition
  }
}

// Retrieve data from MODEL
function getDataModelHandler(topic, p){
    p.data = model.getNotes(storedInfo, true)
}
pubsub.subscribe('getDataPresenter',getDataModelHandler)  
const model = Model()
const presenter = new Presenter(pubsub)
const view = View(pubsub)

function undoModelHandler(topic){
  model.undo()
}
pubsub.subscribe('undoPresenter',undoModelHandler)

function interchageNotesModelHandler(topic, info){
  model.swapNotes(info[0], info[1])
}
pubsub.subscribe('interchageNotesPresenter', interchageNotesModelHandler)

function filterNotesModelHandler(topic, filter){
  model.filterNotes(filter)
}
pubsub.subscribe('filterNotesPresenter',filterNotesModelHandler)

function getDatesModelHandler(topic, info){
  let p = info[0]
  let id = info[1]
  p.creationDate = model.getDate(id, 'c')
  p.lastMDate = model.getDate(id, 'm')
}
pubsub.subscribe('getDatesPresenter',getDatesModelHandler)

function deleteNoteModelHandler(topic,id){
  model.deleteNote(id)
}
pubsub.subscribe('deleteNotePresenter', deleteNoteModelHandler)

function editNoteModelHandler(topic, info){
  model.updateNote(info[0],info[1])
}
pubsub.subscribe('editNotePresenter', editNoteModelHandler)

function saveNoteModelHandler(topic, note){
    model.saveNote(note)
}
pubsub.subscribe('saveNotePresenter', saveNoteModelHandler)

function swapNotesHandler (topic, indexes) {
  presenter.swapNotes(indexes[0], indexes[1])
  let activeNotes = presenter.data
  view.main(activeNotes)
}

pubsub.subscribe('swapNotes', swapNotesHandler)

function textFilterHandler (topic, filter) {
  presenter.filterNotes(filter)
  let activeNotes = presenter.data
  view.main(activeNotes)
}
pubsub.subscribe('newText', textFilterHandler)

function deleteNoteHandler (topic, id) {
  presenter.deleteNote(id)
  let activeNotes = presenter.data
  view.main(activeNotes)
}
pubsub.subscribe('deleteNote', deleteNoteHandler)

function editNoteHandler (topic, info) {
  presenter.editNote(info[0], info[1])
}
pubsub.subscribe('editNote', editNoteHandler)

function saveNoteHandler (topic, note) {
  presenter.saveNote(note)
  let activeNotes = presenter.data
  view.main(activeNotes)
}
pubsub.subscribe('saveNote', saveNoteHandler)

function undoHandler (topic) {
  presenter.undo()
  let activeNotes = presenter.data
  view.main(activeNotes)

}
pubsub.subscribe('undo', undoHandler)

function startAppHandler(topic, activeNotes){
    view.start(activeNotes);
}
pubsub.subscribe('startApp', startAppHandler)

function editClickedHandler(topic, id){
    let dates = presenter.dates(id)
    let activeNotes = presenter.data
    let note = activeNotes[id].note
    view.edit (note, dates, id)
}
pubsub.subscribe('editClicked', editClickedHandler)

function saveEditClickedHandler(topic, info){
    let id = info[0]
    let checker = info[1]
    let data = presenter.data
    let newNote = data[id]['note']
    view.saveEdition(newNote, id, data, checker)
}
pubsub.subscribe('saveEditClicked',saveEditClickedHandler)

function viewHandler(topic, id){
    let dates = presenter.dates(id)
    let activeNotes = presenter.data
    let note = activeNotes[id].note
    view.view(id, note, dates)
}
pubsub.subscribe('viewClicked', viewHandler)
presenter.start()
