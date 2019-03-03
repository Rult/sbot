import * as c from "./commands";
import {client, botID} from "./bot";

let timeoutForAutoReact;
let whoNeedsToReactToSomething = {};
let whichGuildThisUserMeans = {};

export function escapeRegExp(str) {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
export function getRandomElem(arr) {
	return arr[Math.floor(arr.length*Math.random())];
}
export function getSimpleString(str) {
	return str.replace(/\n/g, " ").replace(/ +/g, " ").toLowerCase().replace(/ё/g, "е").replace(/ /g, "_");
}
export function pluralize(n, arr) {
	// by PLAYER_CHAR
	let k = n % 10;
	return arr[(n - k) / 10 % 10 != 1 ? (k != 1 ? ([2, 3, 4].includes(k) ? 1 : 2) : 0) : 2];
}
export function envelope(msg) {
	// функция для реакции конвертом
	if (msg.channel.type == "text") {
		msg.react("✉");
	}
}
export function getGuild(guildName) {
	if (!guildName) {
		return null;
	}
	if (guildName.match(/^\d+$/g)) {
		if (client.guilds.get(guildName)) {
			return guildName;
		}
	}
	let guildId;
	let guildIdFull;
	client.guilds.forEach(key => {
		if (guildName == getSimpleString(key.name)) {
			guildIdFull = key.id;
		} else if (getSimpleString(key.name).match(new RegExp("^(" + escapeRegExp(guildName) + ")"))) {
			guildId = key.id;
		}
	});
	if (!(guildId || guildIdFull)) {
		return;
	}
	return (guildIdFull) ? guildIdFull : guildId;
}
export function getStorage(emojiName, guildName, channel) {
	if (guildName) {
		if (guildName.match(/^\d+$/g)) {
			if (client.guilds.get(guildName)) {
				return client.guilds.get(guildName);
			}
		}
		let guildId;
		let guildIdFull;
		client.guilds.forEach(key => {
			if (guildName == getSimpleString(key.name)) {
				guildIdFull = key.id;
			} else if (getSimpleString(key.name).match(new RegExp("^(" + escapeRegExp(guildName) + ")"))) {
				let currentGuildId = key.id;
				client.guilds.get(key.id).emojis.forEach(key => {
					if (key.name.toLowerCase().match(new RegExp("^(" + escapeRegExp(emojiName) + ")"))) {
						guildId = currentGuildId;
					}
				});
			}
		});
		if (!(guildId || guildIdFull)) {
			return client;
		}
		return (guildIdFull) ? client.guilds.get(guildIdFull) : client.guilds.get(guildId);
	} else {
		return client;
	}
}
export function findEmoji(emojiName, guildName, channel) {
	let emoji;
	let emojiFull;

	if (emojiName.match(/^\d+$/g)) {
		if (client.emojis.get(emojiName)) {
			emoji = client.emojis.get(emojiName);
			return emoji;
		}
	}

	let storage = getStorage(emojiName, guildName, channel);

	if (!storage) {
		return;
	}

	storage.emojis.forEach(key => {
		if (emojiName == key.name.toLowerCase()) {
			emojiFull = key;
		} else if (key.name.toLowerCase().match(new RegExp("^(" + escapeRegExp(emojiName) + ")"))) {
			emoji = key;
		}
	});

	return (emojiFull) ? emojiFull : emoji;
}
export function getEmojiName(emojiText) {
	let emojiRaw;
	if (emojiRaw = emojiText.match(/(?:<:[^:]+:(\d+)>)/)) {
		return emojiRaw[1];
	} else {
		return emojiText;
	}
}
export function findUserToGetAvatar(username) {
	// проверка на айди
	if (username.match(/^\d+$/g)) {
		if (client.users.get(username)) {
			return client.users.get(username);
		}
	}

	// проверка на призывалку
	let usernameId = username.match(/<@\!?(\d+)>/);
	if (usernameId) {
		if (client.users.get(usernameId[1])) {
			return client.users.get(usernameId[1]);
		}
	}

	let guildsCounter = 0;
	let isDisplayNameSuitable = false;
	let isDisplayNameCanBeSuitable = false;
	let result;

	client.guilds.forEach(guild => {
		let usersCounter = 0;
		guild.members.forEach(member => {
			if (member.user.avatar) {
				if (username == getSimpleString(member.displayName)) {
					result = member.user;
					isDisplayNameSuitable = true;
				} else if (getSimpleString(member.displayName).match(new RegExp("^(" + escapeRegExp(username) + ")"))) {
					if (!isDisplayNameSuitable) {
						result = member.user;
						isDisplayNameCanBeSuitable = true;
					}
				} else if (member.nickname) {
					if (username == getSimpleString(member.user.username)) {
						if (!isDisplayNameSuitable && !isDisplayNameCanBeSuitable) {
							result = member.user;
						}
					} else if (getSimpleString(member.user.username).match(new RegExp("^(" + escapeRegExp(username) + ")"))) {
						if (!result && !isDisplayNameSuitable && !isDisplayNameCanBeSuitable) {
							result = member.user;
						}
					}
				}
			}
		});
	});
	return result;
}
export function autoreact(msg, args, isCommandCanBeAnEmoji) {
	if (!args[0]) {
		msg.react("📜");
		return;
	};

	let emojiName;
	let guildName;
	let messageId = args[1];

	let guildCheck;

	emojiName = getEmojiName(args[0]);

	let emojiError = ["👋", "😶", "🤔", "351002389991653378", "358952906248028160", "357960229259837440", "520641845634531328"];

	if (guildCheck = emojiName.match(/^([^:]+)(?::(\S+))$/)) {
		emojiName = guildCheck[1];
		guildName = guildCheck[2];
	}

	if (messageId) {
		let emoji = findEmoji(emojiName, guildName, msg.channel);

		if (!emoji) {
			if (isCommandCanBeAnEmoji) {
				msg.react(getRandomElem(emojiError));
			} else {
				msg.react("343057042862243840");
			}
			return;
		};

		let wrongChannels = 0;

		client.channels.forEach(key => {
			if (key.type == "text") {
				key.fetchMessage(messageId)
					.then(messageToReact => {
						messageToReact.react(emoji);
						msg.react("⏳");
						let removeReactionTimeout = setTimeout(() => messageToReact.reactions.get(emoji.name + ":" + emoji.id).remove(client.user), 25000);
						messageToReact.awaitReactions((reaction, user) => {
							if (user.id == msg.author.id && reaction.emoji.id == emoji.id) {
								messageToReact.reactions.get(emoji.name + ":" + emoji.id).remove(client.user);
								clearTimeout(removeReactionTimeout);
							}
						}, { time: 25000 });
					})
					.catch(() => {
						if (++wrongChannels == client.channels.size) {
							msg.react("🤷");
						}
					});
			} else {
				wrongChannels++;
			}
		});
	} else {
		if (!findEmoji(emojiName, guildName, msg.channel)) {
			if (isCommandCanBeAnEmoji) {
				msg.react(getRandomElem(emojiError));
			} else {
				msg.react("343057042862243840");
			}
			return;
		}

		msg.react("👌");

		whoNeedsToReactToSomething[msg.author.id] = emojiName;
		whichGuildThisUserMeans[msg.author.id] = guildName;
	}
	deleteUserMessage(msg);
}
export function deleteUserMessage(msg) {
	if (msg.channel.type == "text") { // если бот не начал "беседовать" с юзером
		let bot_permissions = msg.channel.permissionsFor(client.user);
		if (bot_permissions.has("MANAGE_MESSAGES")) {
			msg.delete(10000)
				.then(() => {})
				.catch(error => console.log(error));
		}
	}
}
export function sendEmojiLinkEmbed(msg, emoji) {
	if (emoji.animated) {
		msg.channel.send({embed: {title: "Emoji", description: ("<a:" + emoji.name + ":" + emoji.id + "> – " + emoji.name), image: {url: ("https://cdn.discordapp.com/emojis/" + emoji.id + ".gif")}}});
	} else {
		msg.channel.send({embed: {title: "Emoji", description: ("<:" + emoji.name + ":" + emoji.id + "> – " + emoji.name), image: {url: ("https://cdn.discordapp.com/emojis/" + emoji.id + ".png")}}});
	}
}
export function sendUserAvatarEmbed(msg, user) {
	let avaTemp = user.avatarURL;
	// console.log(avaTemp);
	let avaTempRE = avaTemp.match(/^((?:.*)\.(\w+))/);

	let isAvaGif = (avaTempRE[2] == "gif") ? true : false;
	let avatarURLFixed = isAvaGif ? avaTemp + "?size=2048" : avaTemp;

	msg.channel.send({embed: {title: "Avatar", description: user.tag, image: {url: avatarURLFixed}}});
	// msg.channel.send({embed: {title: "Avatar", description: user.tag, image: {url: avaTemp}}});

	// if (isAvaGif) {
	// 	msg.channel.send("В полном размере:\n<" + avaTemp + ">");
	// }
}
export function isThisBotsChannel(msg) {
	if (msg.channel.type == "text" && msg.channel.guild.id == "110107304413638656" && msg.channel.id != "334369998866874369") {
		return false;
	} else {
		return true;
	}
}
export function showHomestuckPage(msg, comic_embed, usedArrowButton, contentText) {
	let embed = {embed: comic_embed};
	if (usedArrowButton) {
		if (contentText) {
			msg.edit(contentText, embed);
		} else {
			msg.edit(embed);
		}
	} else {
		let contentToSend = (contentText) ? contentText : embed;
		msg.channel.send(contentToSend)
			.then((msg) => {
				msg.react("⬅")
					.then(() => {
						msg.react("➡");
					})
					.catch(error => console.log(error));
			})
			.catch(error => console.log(error));
	}
}
export function checkHomestuckReaction(messageReaction, user) {
	let msg = messageReaction.message;
	let msgReaction = messageReaction.emoji.name;

	if (["⬅", "➡"].includes(msgReaction) && msg.author.id == botID && user.id != botID) {
		let msg = messageReaction.message;
		let cMatch, eMatch, page_number;
		if (cMatch = msg.content.match(/hs#(\d+)/)) {
			page_number = Number(cMatch[1]);
		} else if (msg.embeds[0] && (eMatch = msg.embeds[0].author.name.match(/hs#(\d+)/))) {
			page_number = Number(eMatch[1]);
		}

		if (page_number) {
			if (msgReaction == "➡") {
				c.Homestuck(msg, [page_number + 1], null, true);
			} else if (msgReaction == "⬅") {
				c.Homestuck(msg, [page_number - 1], null, true);
			}
		}

	}
}
export function setCinemaRole(user, doesUserNeedRole) {
	client.guilds.get("110107304413638656").fetchMember(user.id)
		.then((member) => {
			if (doesUserNeedRole) {
				console.log(member.user.tag + " asked to add them Cinema role.");
				member.addRole("542396782878130206")
					.then(() => {})
					.catch(error => console.log(error));
			} else {
				console.log(member.user.tag + " asked to remove them Cinema role.");
				member.removeRole("542396782878130206")
					.then(() => {})
					.catch(error => console.log(error));
			}
		})
		.catch(error => console.log(error));
}
export function sfTime(s) {
    return new Date(1420070400000 + s / 4194304);
}
export function dateStr(d) {
    if (!d.toJSON) {
        d = new Date(d);
    }
    d.setHours(d.getHours() + 3);
    return d.toJSON().split(".")[0].replace(/T/, ' ') + ' МСК';
}
export function checkReactionForAutoreact(messageReaction, user) {
	if (whoNeedsToReactToSomething[user.id]) {
		let currentUser = client.users.get(user.id);
		let currentEmoji = findEmoji(whoNeedsToReactToSomething[user.id], whichGuildThisUserMeans[user.id]);

		messageReaction.message.react(currentEmoji);
		clearTimeout(timeoutForAutoReact);

		delete whoNeedsToReactToSomething[user.id];
		delete whichGuildThisUserMeans[user.id];

		let timerForDeletingAutoReaction = setTimeout(() => {
			messageReaction.message.reactions.get(currentEmoji.name + ":" + currentEmoji.id).remove(client.user);
		}, 25000);

		messageReaction.message.awaitReactions((messageReactionAwaited, user) => {
			if (user.id == currentUser.id && messageReactionAwaited.emoji.id == currentEmoji.id) {
				messageReactionAwaited.message.reactions.get(messageReactionAwaited.emoji.name + ":" + messageReactionAwaited.emoji.id).remove(client.user);
				clearTimeout(timerForDeletingAutoReaction);
			}
		}, { time: 25000 });

		return true;
	} else {
		return false;
	}
}
export function checkEmojiListReaction(msgReaction, user, msg, serverArray) {
	if (msg.author.id == botID && user.id != botID) {
		let turn = "";
		if (msgReaction == "⬅") {
			turn = "-";
		} else if (msgReaction == "➡") {
			turn = "+";
		}
		c.EmojiList(msg, [turn], false, true, serverArray);
	}
}
