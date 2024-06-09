var year = document.URL.split('/').slice(-2, -1)[0]
var bonus = year == "2016" || year == "2018" ? 4 : 10

const POSITIONS = ["GK", "DF", "MF", "FW"];

const EVENTS = {
    "Goal": {"GK": 10, "DF": 7, "MF": 6, "FW": 5},
    "Assist": {"GK": 3, "DF": 3, "MF": 3, "FW": 3},
    "CS": {"GK": year == "2016" ? 6 : 5, "DF": year == "2016" ? 5 : 4, "MF": 0, "FW": 0},
    "Penalty": {"GK": 3, "DF": 2, "MF": 2, "FW": 2},
    "Save": {"GK": 2, "DF": bonus, "MF": bonus, "FW": bonus},
    "OG": {"GK": -1, "DF": -2, "MF": -2, "FW": -2},
    "Miss": {"GK": -2, "DF": -2, "MF": -2, "FW": -2},
    "Red": {"GK": -2, "DF": -2, "MF": -2, "FW": -2}
};

var header = document.getElementById("Position");
POSITIONS.forEach(position => {
    var th = document.createElement("th");
    th.appendChild(document.createTextNode(position));
    header.appendChild(th);
});

Object.entries(EVENTS).forEach(entry => {
    const [type, values] = entry;
    var row = document.getElementById(type);
    POSITIONS.forEach(position => {
        var value = values[position];
        var td = document.createElement("td");
        td.classList.add(value > 0 ? "text-success" : value < 0 ? "text-danger" : "text-secondary");
        td.appendChild(document.createTextNode(value));
        row.appendChild(td);
    });
});

var xhr = new XMLHttpRequest();
xhr.open("GET", "data.txt", true);
xhr.onload = () => load(xhr.responseText);
xhr.send(null);

function load(data) {
    var managers = [];
    var indices = {};
    var players = [];
    var squads = {};
    var teams = {};
    var temp = null;
    var pick = 0;
    var cards = [];

    data.split("\n").filter(line => line != "").forEach(line => {
        var tokens = line.split(" ").filter(token => token != "");
        var type = tokens[0];
        var arg = tokens[1];
        var getString = index => tokens.slice(index).join(" ");
        var getName = () => getString(2);
        var getPlayer = () => players[indices[getString(1)]];
        switch (type) {
            case "Manager":
                var manager = {name: getName(), country: arg, value: 0, picks: 0, transfers: 0};
                managers.push(manager);
                squads[manager.name] = [];
                teams[manager.name] = [];
                break;
            case "Country":
                temp = arg;
                break;
            case "Player":
                var player = {name: getName(), country: temp, value: 0, position: arg, manager: null, active: null};
                indices[player.name] = players.length;
                players.push(player);
                break;
            case "Draft":
                var player = getPlayer();
                var offset = pick++ % (2 * managers.length);
                player.manager = managers[offset < managers.length ? offset : (2 * managers.length - 1) - offset];
                cards.push(createCard(0, fromEvent(type, ++player.manager.picks, fromManager(player.manager)), [fromPlayer(player)]));
                break;
            case "Out":
                temp = getPlayer();
                break;
            case "In":
                var player = getPlayer();
                player.manager = temp.manager;
                temp.manager = null;
                cards.push(createCard(0, fromEvent("Transfer", ++player.manager.transfers, fromManager(player.manager)), [fromIn(player), fromOut(temp)]));
                break;
            case "Transfer":
                players.forEach(player => player.active = player.manager);
                break;
            default:
                var player = getPlayer();
                var value = EVENTS[type][player.position];
                player.value += value;
                if (player.active) {
                    player.active.value += value;
                }
                cards.push(createCard(value, fromEvent(type, value, fromPlayer(player)), [fromManager(player.active)]));
        }
    });

    players.sort((a, b) => sortPosition(a, b) || sortName(a, b));
    players.forEach(player => {
        if (player.manager) {
            squads[player.manager.name].push(player);
        }
        if (player.active) {
            teams[player.active.name].push(player);
        }
    });

    var standingsTab = document.getElementById("standings");
    var liveTab = document.getElementById("live");
    managers.sort((a, b) => sortValue(a, b) || sortName(a, b));
    managers.forEach((manager, index) => {
        var value = index == 0 ? 1 : index == managers.length - 1 ? -1 : 0;
        standingsTab.appendChild(createCard(value, fromManager(manager), squads[manager.name].map(fromPlayer)));
        liveTab.appendChild(createCard(value, fromManager(manager), teams[manager.name].map(fromPlayer)));
    });

    var playersTab = document.getElementById("players");
    players.sort((a, b) => sortValue(a, b) || sortPosition(a, b) || sortName(a, b));
    players.forEach(player => playersTab.appendChild(createCard(player.value, fromPlayer(player), [fromManager(player.manager)])));

    var eventsTab = document.getElementById("events");
    cards.reverse();
    cards.forEach(card => eventsTab.appendChild(card));
}

function sortValue(a, b) {
    return b.value - a.value;
}

function sortPosition(a, b) {
    return POSITIONS.indexOf(a.position) - POSITIONS.indexOf(b.position);
}

function sortName(a, b) {
    return a.name.localeCompare(b.name);
}

function fromEvent(name, value, info) {
    var span = document.createElement("span");
    span.appendChild(document.createTextNode(name + " (" + value + ")"));
    span.appendChild(document.createTextNode("\u00A0"));
    span.appendChild(document.createTextNode("\u00A0"));
    span.appendChild(info);
    return span;
}

function fromOut(player) {
    var span = document.createElement("span");
    span.classList.add("text-danger");
    span.appendChild(document.createTextNode("\u290B"));
    span.appendChild(document.createTextNode("\u00A0"));
    span.appendChild(document.createTextNode("\u00A0"));
    span.appendChild(fromPlayer(player));
    return span;
}

function fromIn(player) {
    var span = document.createElement("span");
    span.classList.add("text-success");
    span.appendChild(document.createTextNode("\u290A"));
    span.appendChild(document.createTextNode("\u00A0"));
    span.appendChild(document.createTextNode("\u00A0"));
    span.appendChild(fromPlayer(player));
    return span;
}

function fromPlayer(player) {
    var span = document.createElement("span");
    span.appendChild(document.createTextNode(player.position));
    span.appendChild(document.createTextNode("\u00A0"));
    span.appendChild(document.createTextNode("\u00A0"));
    span.appendChild(fromPerson(player));
    return span;
}

function fromManager(manager) {
    return manager ? fromPerson(manager) : document.createTextNode("Free");
}

function fromPerson(person) {
    var span = document.createElement("span");
    var flag = document.createElement("img");
    flag.src = "../flags/" + person.country + ".webp";
    span.appendChild(flag);
    span.appendChild(document.createTextNode("\u00A0"));
    span.appendChild(document.createTextNode("\u00A0"));
    span.appendChild(document.createTextNode(person.name + " (" + person.value + ")"));
    return span;
}

function createCard(value, title, rows) {
    var card = document.createElement("div");
    card.classList.add("card");
    card.classList.add("mb-1");
    card.classList.add(value > 0 ? "border-success" : value < 0 ? "border-danger" : "border-info");

    var header = document.createElement("div");
    header.classList.add("card-header");
    header.appendChild(title);
    card.appendChild(header);

    var body = document.createElement("div");
    body.classList.add("card-body");
    rows.forEach(row => {
        var div = document.createElement("div");
        div.appendChild(row);
        body.appendChild(div);
    });
    card.appendChild(body);

    return card;
}
