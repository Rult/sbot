// подключаем модули
require('http').createServer().listen(3000);
const Discord = require("discord.js");
export const client = new Discord.Client();
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

export const readyTime = Date.now();
export const dateOptions = {
	weekday: "long",
	year: "numeric",
	month: "short",
	day: "numeric",
	hour: "2-digit",
	minute: "2-digit",
	second: "2-digit",
	hour12: false,
	timeZone: "Europe/Moscow"
};
export const ownerID = "172075054912372737";
export const botID = "343848758259482624";

import * as s from "./secondary";
import * as c from "./commands";
import {commandsRegExp, simpleAnswers} from "./aliases";

let serverArray = [];
export let requestsCounter = 0;

// что делать в ответ на сообщение
function processMessage(msg) {
	let isSentImageHere = false;

	// если юзер отправил в лс картинку-аттачмент
	if (msg.channel.type == "dm") {
		msg.attachments.forEach(att => {
			let xhrImgur = new XMLHttpRequest();
			xhrImgur.open("POST", "https://api.imgur.com/3/image");
			xhrImgur.setRequestHeader("Authorization", "Client-ID 734f878d1bebba9");
			xhrImgur.onload = function() {
				let imgurData = JSON.parse(xhrImgur.responseText).data;
				if (!imgurData.error) {
					if (msg.content) {
						let ogURLParts = att.url.split("/");
						let ogImgName = ogURLParts[ogURLParts.length - 1];
						let imageDate = "";
						if (ogImgName.match(/\d{4}-\d{2}-\d{2}/)) {
							imageDate = ogImgName.match(/\d{4}-\d{2}-\d{2}/)[0];
						}
						c.Send(msg, false, "sbot " + imgurData.link + " " + msg.content, att.url, imgurData.id, imageDate);
					} else {
						msg.react("📜");
						msg.channel.send("Чтобы отправить картинку, нужно добавить к ней описание, дату и место.");
					}
				} else {
					c.Send(msg, false, "sbot " + att.url + " " + msg.content);
				}
			}
			xhrImgur.send(att.url);
			isSentImageHere = true;
		});
	}

	if (isSentImageHere) {
		return;
	}

	// обработка сообщения
	let msgoc = msg.content.replace(/\n/g, " ").replace(/ +/g, " ");
	let msglc = msgoc.toLowerCase().replace(/ё/g, "е");
	let msgCommandOriginal;
	let msgCommand;
	let msglcDivided;

	// проверка сообщения на наличие команды
	if (msglcDivided = msglc.match(new RegExp("^(?:сб|сбот|стилл?бот|sb|sbot|still?bot|<@" + botID + ">)" + ",? (.+)$"))) {
		msgCommandOriginal = msgoc.match(/^\S+ (.+)$/)[1];
		msgCommand = msglcDivided[1];
	} else if (msg.channel.type != "text") {
		msgCommandOriginal = msgoc;
		msgCommand = msglc;
	} else {
		return;
	}

	// only allowed RC channels!
	if (msg.channel.type == "text" && msg.channel.guild.id == "110107304413638656" && !(["519609441109147655","521683316899053596","334369998866874369", "541594001992581122"].includes(msg.channel.id))) {
		 return;
	}

	// если всё ок, продолжаем...
	requestsCounter++;

	// отослать текст запроса в логи
	let serverWhereUserIs = "Direct Messages";
	if (msg.channel.type == "text") {
		serverWhereUserIs = (msg.channel.guild.name + " (" + msg.channel.guild.id + ")");
	}
	console.log((new Date).toLocaleString("ru", dateOptions) + "\nFrom " + serverWhereUserIs + ":\n" + msg.author.id + " | " + msg.author.tag + ": " + msg.content);

	// поделить запрос на "основную команду" и аргументы
	let args = msgCommand.split(" ");
	let cmd = args.shift();

	// ищем команду в регулярках
	for (let i of commandsRegExp) {
		if (cmd.match(i.r)) {
			i.f(msg, args, msgCommandOriginal);
			return;
		}
	}

	// "общение"
	for (let i of simpleAnswers) {
		if (msgCommand.match(i.r)) {
			if (i.e) {
				msg.react(i.e);
			} else if (i.t) {
				msg.channel.send(s.getRandomElem(i.t));
			}
			return;
		}
	}

	// если запрос не соответствует ни одной из команд, попробовать автореакцию
	args.unshift(cmd);
	s.autoreact(msg, args, true);
}

// действия непосредственно после запуска бота
client.on('ready', () => {

	let readyTimeString = new Date(readyTime).toLocaleString("ru", dateOptions);
	console.log(client.user.tag + " entered Discord on " + readyTimeString);

	client.user.setPresence({game: {name: "sb help", type: 0}});
	// botID = client.user.id;

	// кэширование сообщений для реакций и сбор айдишников серверов
	client.guilds.forEach(guild => {
		if (guild.emojis.size) {
			serverArray.push(guild.id);
		}
		guild.channels.forEach(channel => {
			if (channel.type == "text") {
				if (channel.permissionsFor(client.user).has("READ_MESSAGES")) {
					channel.fetchMessages({limit: 50})
						.then(() => {})
						.catch(error => console.log(error));
				}
			}
		});
	});

	// кэширование реакций кинотеатра
	client.channels.get("541594001992581122").fetchMessage("542389154424553549")
		.then(() => {})
		.catch(error => console.log(error));

});
client.on('message', msg => {
	if (msg.author.id == botID) return;
	setTimeout(processMessage, 100, msg);
});
client.on('messageReactionAdd', (messageReaction, user) => {
	let msg = messageReaction.message;
	let msgReaction = messageReaction.emoji.name;

	if (s.checkReactionForAutoreact(messageReaction, user)) {
		return;
	} else if (msgReaction == "❌" && [botID, ownerID].includes(msg.author.id) && user.id == ownerID) {
		if (msg.channel.id != "526441608250392577") {
			msg.delete(300);
		}
	} else if (msgReaction == "📽" && msg.id == "542389154424553549") {
		s.setCinemaRole(user, true);
	} else if (msg.content.startsWith("Доступные эмоджи:") && ["⬅", "➡"].includes(msgReaction)) {
		s.checkEmojiListReaction(msgReaction, user, msg, serverArray)
	} else {
		s.checkHomestuckReaction(messageReaction, user);
	}
});
client.on('messageReactionRemove', (messageReaction, user) => {
	let msg = messageReaction.message;
	let msgReaction = messageReaction.emoji.name;

	if (msgReaction == "📽" && msg.id == "542389154424553549") {
		s.setCinemaRole(user, false);
	} else if (msg.content.startsWith("Доступные эмоджи:") && ["⬅", "➡"].includes(msgReaction)) {
		s.checkEmojiListReaction(msgReaction, user, msg, serverArray)
	} else {
		s.checkHomestuckReaction(messageReaction, user);
	}

});
client.on('guildCreate', (guild) => {
	serverArray.push(guild.id);
});
client.on('guildDelete', (guild) => {
	let index = serverArray.indexOf(guild.id);
	if (index) {
		serverArray.splice(index, 1);
	}
});

// подключение к Дискорду
const TOKEN = process.env.BOT_TOKEN;
client.login(TOKEN);
