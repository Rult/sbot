import * as s from "./secondary";
import {client, readyTime, ownerID, botID, requestsCounter} from "./bot";

const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
const Cheerio = require('cheerio');

import {translatedTags} from "./aliases";

const helpLines = [
	"Чтобы спросить что-либо, обратись ко мне по имени и введи команду.",
	"Например: `сбот имг креатив намия`",
	"В лс можно без обращения: `имг креатив намия`",
	"*Скобки `<>[]` вводить не надо (они означают обязательные и не очень параметры).*",
	"Пустить меня на свой сервер можно по [этой ссылке через веб-браузер](https://discordapp.com/api/oauth2/authorize?client_id=343848758259482624&scope=bot&permissions=0)."
];
const helpEmbed = {
	color: 0x7486C2,
	title: "Привет, меня зовут СтиллБот.",
	description: helpLines.join("\n"),
	fields: [
		{
			name: "<название_эмоджи>",
			value: "Запросить реакцию на сообщение (нужно поставить на него любой эмоджи)."
		},
		{
			name: "хоумстак [номер_страницы]",
			value: "Почитать [комикс](https://www.homestuck.com/story)."
		},
		{
			name: "имг [теги через пробел]",
			value: "Рандомная пикча из [Галереи](https://stilltest.tk/gallery/)."
		},
		{
			name: "<описание пикчи> <прикреплённое изображение>",
			value: "Предложить свой скриншот в Галерею (только в ЛС).\nЕсли я поставил в ответ 📮, значит, успешно отправилось."
		}
	],
	image: {
		url: "https://cdn.discordapp.com/attachments/519609441109147655/548249010100764683/sbotupload.png"
	}
}

export function Help(msg) {
	if (!s.isThisBotsChannel(msg)) {
		msg.react("🤖");
		return;
	}

	msg.channel.send({embed: helpEmbed});
}
export function Ping(msg) {
	let pongText = "🏓 Понг!";
	msg.channel.send(pongText)
		.then((pong) => {
			let userTime = msg.createdTimestamp / 1000;
			let botTime = pong.createdTimestamp / 1000;
			let pongTime = (botTime - userTime).toFixed(3);
			pong.edit(pongText + " " + pongTime + " сек.");
		})
		.catch(error => console.log(error));
}
export function Img(msg, args) {
	// do not spam by pictures
	if (!s.isThisBotsChannel(msg) && msg.channel.id != "519609441109147655") {
		msg.react("🤖");
		return;
	}

	let typeOfImage = ".png";

	for (let i = 0; i < args.length; i++) {
		for (let key in translatedTags) {
			if (args[i] == "gif") typeOfImage = ".gif";

			if (args[i].match(/^[!]/)) {
				args[i] = "-" + args[i].substr(1);
			}

			if (args[i].match(new RegExp("^(" + translatedTags[key] + ")[.!,]?$"))) {
				args[i] = key;
				break;
			} else if (args[i].match(new RegExp("^[-](" + translatedTags[key] + ")[.!,]?$"))) {
				args[i] = "-" + key;
				break;
			}
		}
	}

	let argsText = "";

	if (args.length > 0) {
		argsText = args.join(",");
		argsText = "?tags=" + encodeURIComponent(argsText);
	}

	let xhrImg = new XMLHttpRequest();
	xhrImg.open('GET', 'https://chaoscraft.ml/files/gallery/random/' + argsText);
	xhrImg.onreadystatechange = function () {
		if (this.readyState == 4 && this.status == 200) {
			let imageInfo = JSON.parse(this.responseText);
			if (!imageInfo.error) {
				msg.channel.send({
					embed: {
						color: 0x7486C2,
						author: {
							name: imageInfo.title,
							icon_url: "https://i.imgur.com/5EOhj0z.png",
							url: ("https://stilltest.tk/gallery/#" + imageInfo.id)
						},
						description: ("Теги: " + imageInfo.tags.join(", ") + (imageInfo.date ? "\nДата: " + imageInfo.date : "")),
						image : {
							url : ("https://i.imgur.com/" + imageInfo.id + typeOfImage)
						}
					}
				});
			} else {
				msg.react("343057042862243840");
			}
		}
	}
	xhrImg.send(null);
}
export function Tags(msg, args) {
	if (args[0]) {
		return;
	}

	let tags = "Доступные теги:\n\n";
	for (let key in translatedTags) {
		tags += ("`" + key + "` ");
	}
	msg.author.send(tags)
		.then(() => {
			s.envelope(msg);
		})
		.catch(error => console.log(error));
}
export function Send(msg, args, msgCommandOriginal, discordLink, imageID, imageDate) {
	if (!discordLink) discordLink = "";
	if (!imageID) imageID = "";
	if (!imageDate) imageDate = "";

	let imageParamsArray = msgCommandOriginal.match(/\S+ (\S+) ([\s\S]+)/);

	if (!imageParamsArray) {
		msg.react("📜");
		msg.channel.send("Чтобы отправить картинку, нужно добавить к ней описание, дату и место.");
		return;
	}

	let imageLink = imageParamsArray[1];

	let tagsSplit = imageParamsArray[2].split(/(?:tags|т[еаэ]ги):/i, 2);
	let imageTitle = tagsSplit[0].replace(/\s+$/g, "");

	let imageTags = [];
	if (tagsSplit[1]) {
		imageTags = tagsSplit[1].toLowerCase().replace(/^\s+/g, "").split(/[,;\s]+/);
	}
	imageTags.unshift("screenshot", "minecraft");
	let imageTagsText = "";
	for (let i in imageTags) {
		imageTagsText += '\"' + imageTags[i] + '\", ';
	}
	if (imageTagsText) {
		imageTagsText = imageTagsText.slice(0, -2);
	}

	let imageJSON = '```json\n\t"' + imageID + '": {\n\t\t"title": "' + imageTitle + '",\n\t\t"date": "' + imageDate + '",\n\t\t"takenBy": "' + msg.author.username + '",\n\t\t"big": true,\n\t\t"tags": ['+ imageTagsText +']\n\t},\n```';

	client.channels.get("526441608250392577").send("От " + msg.author.tag + ":\n" + "<" + discordLink + ">\n" + imageLink + "\n" + imageJSON)
		.then(() => {
			msg.react("📮");
		})
		.catch(error => console.log(error));
}
export function React(msg, args) {
	s.autoreact(msg, args, false); // функция вынесена, так как к ней нужен доступ и без команды
}
export function EmojiList(msg, args, msgCommandOriginal, usedArrowButton, serverArray) {
	let fromWhichServer = "343851676404547585";
	let askedServer = s.getGuild(args[0]);

	let goRight = false;
	let goLeft = false;
	if (args[0] == "+") {
		goRight = true;
	} else if (args[0] == "-") {
		goLeft = true;
	} else if (askedServer) {
		fromWhichServer = askedServer;
	}

	if (usedArrowButton && msg.content.match(/\d{17,20}/g)) {
		let prevServer = msg.content.match(/\d{17,20}/g)[0];
		let p = serverArray.indexOf(prevServer);
		if (p > -1) {
			let n;
			if (goRight) {
				n = p + 1;
			} else if (goLeft) {
				n = p - 1;
			}
			if (n < 0) {
				n = serverArray.length - 1;
			} else if (n >= serverArray.length) {
				n = 0;
			}

			fromWhichServer = serverArray[n];
		}
	}

	let emServ = client.guilds.get(fromWhichServer);
	if (emServ && emServ.emojis.size) {
		let embed = {
			color: 0xD4A940,
			fields: [
				{
					name: "1-1:",
					value: ""
				}
			]
		}

		let i = 0;
		let f = 0;
		let emojiDesc = "Доступные эмоджи:\n" + emServ.name + " `" + emServ.id + "`";
		let emojiList = [];

		let fieldStart = 1;

		emServ.emojis.forEach(key => {
			let prefix = "<:";
			let postfix = ">" + " `" + key.name + "`";
			if (key.animated) {
				prefix = "<a:";
			}
			if (++i % 10 == 1) {
				prefix = "\n" + prefix
			}
			let emojiInfo = prefix + key.name + ":" + key.id + postfix;
			emojiList.push(emojiInfo);
			let emListText = emojiList.join(" ");

			if (f >= 6) {
				return;
			} else if (emListText.length < 993) {
				embed.fields[f].name = fieldStart + "-" + i + ":";
				embed.fields[f].value = emListText;
			} else {
				emojiList = [];
				emojiList.push(emojiInfo);
				if (emojiInfo.length < 993) {
					fieldStart = i;
					f++;
					embed.fields[f] = {};
					embed.fields[f].name = fieldStart + "-" + i + ":";
					embed.fields[f].value = emojiInfo;
				}
			}
		});

		/*
		emojis += emojiList.join(" ");
		if (emojis.length >= 2000) {
			emojis.substring(0, emojis.length) + "…";
		}
		*/

		if (usedArrowButton) {
			msg.edit(emojiDesc, {embed: embed});
		} else {
			msg.channel.send(emojiDesc, {embed: embed})
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

	return;
}
export function Sticker(msg, args) {
	// do not spam by pictures
	if (!s.isThisBotsChannel(msg)) {
		msg.react("🤖");
		return;
	}

	if (!args[0]) {
		msg.react("📜");
		return;
	}

	let emoji;

	if (args[0].match(/^\d+$/g)) {
		if (client.emojis.get(args[0])) {
			emoji = client.emojis.get(args[0]);
			s.sendEmojiLinkEmbed(msg, emoji);
			s.deleteUserMessage(msg);
			return;
		}
	}

	let emojiName = s.getEmojiName(args[0]);

	let guildName;
	let guildCheck;

	if (guildCheck = emojiName.match(/^([^:]+)(?::(\S+))$/)) {
		emojiName = guildCheck[1];
		guildName = guildCheck[2];
	}

	emoji = s.findEmoji(emojiName, guildName, msg.channel);

	if (!emoji) {
		msg.react("343057042862243840");
		return;
	}

	s.sendEmojiLinkEmbed(msg, emoji);
}
export function Servers(msg) {
	if (msg.author.id != ownerID) {
		return;
	}
	let embed = {
		color: 0x888888,
		description: "```"
	}

	let counter = 0;
	client.guilds.forEach(key => {
		counter++;
		embed.description += "\n" + key.id + " | " + key.name;
	});
	embed.description += "```";
	embed.title = counter + " guilds";

	msg.author.send({embed: embed})
		.then(() => {
			s.envelope(msg);
		})
		.catch(error => console.log(error));
}
export function Avatar(msg, args, msgCommandOriginal) {
	// do not spam by pictures
	if (!s.isThisBotsChannel(msg)) {
		msg.react("🤖");
		return;
	}
	let user;
	if (args[0]) {
		user = s.findUserToGetAvatar(s.getSimpleString(msgCommandOriginal.match(/\S+ (.+)/)[1]));
		if (user) {
			if (user.avatar) {
				s.sendUserAvatarEmbed(msg, user);
			}
		} else {
			msg.react("343057042862243840");
		}
	} else {
		user = msg.author;
		s.sendUserAvatarEmbed(msg, user);
	}
}
export function Invite(msg) {
	msg.author.send("Ты можешь пустить меня на свой сервер с помощью этой ссылки: \nhttps://discordapp.com/api/oauth2/authorize?client_id=" + botID + "&scope=bot&permissions=0")
		.then(() => {
			s.envelope(msg);
		})
		.catch(error => console.log(error));
}
export function Uptime(msg) {

	let diff = Date.now() - readyTime;
	let tarr = [1000, 60, 60, 24];
	for (let i in tarr) {
		let x = tarr[i];
		tarr[i] = diff % x;
		diff = (diff - tarr[i]) / x;
	}
	tarr.push(diff);
	tarr.shift();
	let warr = [
		['секунду', 'секунды', 'секунд'],
		['минуту', 'минуты', 'минут'],
		['час', 'часа', 'часов'],
		['день', 'дня', 'дней'],
	];
	let sarr = [];
	for (let i = tarr.length - 1; i >= 0; i--) {
		if (!tarr[i]) {
			continue;
		}
		sarr.push(tarr[i] + ' ' + s.pluralize(tarr[i], warr[i]));
	}

	msg.channel.send("Я работаю уже " + sarr.join(', ') + '.');
}
export function Homestuck(msg, args, msgCommandOriginal, usedArrowButton) {
	if (!s.isThisBotsChannel(msg)) {
		msg.react("🤖");
		return;
	}

	let page_number;

	if (args[0]) {
		if (Number(args[0]) >= 1 && Number(args[0]) <= 8130) {
			page_number = args[0];
		} else {
			return;
		}
	} else {
		page_number = 1;
	}

	let page_link = 'https://www.homestuck.com/story/' + page_number;
  let comic_title_empty = "hs#" + page_number;
  let got_error_already = false;
	let embed_color = 0x249E28;

	let comic_embed = {
		color: embed_color,
		author: {
			url: page_link,
			name: comic_title_empty
		}
	}

  let xhrHS = new XMLHttpRequest();
  xhrHS.open('GET', page_link);
  xhrHS.setRequestHeader("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:62.0) Gecko/20100101 Firefox/62.0");

  xhrHS.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      let $ = Cheerio.load(this.responseText);

      let content_container = $('div#content_container');
      let flash_div = $('div#o_flash-container');


      // detecting video
      let is_there_video = false;
      let yt_link = "";
      let yt_link_code;

      if (flash_div.length) {
        let yt_raw = flash_div.html().match(/\'youtubeid\', \'(.+)\'/);
        if (yt_raw) {
          yt_link_code = yt_raw[1];
        }
      } else {
        let yt_raw = $('iframe.ar-inner').attr('src');
        if (yt_raw) {
          yt_link_code = yt_raw.match(/embed\/(.+)/)[1];
        }
      }
      if (yt_link_code) {
        yt_link = "https://youtu.be/" + yt_link_code;
        is_there_video = true;
      }


      if (is_there_video) {
        // send title, desc and video link
        s.showHomestuckPage(msg, {}, usedArrowButton, comic_title_empty + "\n" + yt_link);
      } else {

				// getting title
	      let comic_title = $('h2.type-hs-header').text();
	      if (comic_title && !is_there_video) {
	        comic_title = comic_title + " (hs#" + page_number + ")";
	      } else {
	        comic_title = comic_title_empty;
	      }
				comic_embed.author.name = comic_title;

	      // getting description
	      let desc = $('p.type-rg').text().replace(/\ +/g, " ").replace(/^\s+/, "").replace(/\s+$/, "");
	      let desc_limit = 2047;
	      if (desc.length > desc_limit) {
	        desc = desc.substring(0, desc_limit) + "…";
	      } else if (desc.length == 0) {
	        desc = "";
	      }
				comic_embed.description = desc;

        // getting images
        let imgs;
        let img_link = "";
        let is_img_from_flash = false;
        if (content_container.length) {
          imgs = content_container.find('img.mar-x-auto.disp-bl');
          if (!imgs.length) {
            let imgs_raw = $('div.bg-scratch-mid-green.pad-t-lg').find('img');
            if (imgs_raw.length) {
              imgs = imgs_raw.attr('src');
              is_img_from_flash = true;
            }
          }
        } else {
          imgs = $('img.mar-x-auto.disp-bl');
        }
        if (flash_div.length && !imgs.length) {
          let imgs_raw = flash_div.html().match(/\'altimgsrc\', \'(.+)\'/);
          if (imgs_raw) {
            imgs = imgs_raw[1];
            is_img_from_flash = true;
          }
        }
        if (imgs.length) {
          // send title, image and desc
          if (is_img_from_flash) {
            img_link = "https://www.homestuck.com" + imgs;
					} else if (imgs.attr('src').startsWith("/")) {
						img_link = "https://www.homestuck.com" + imgs.attr('src');
          } else {
            img_link = imgs.attr('src');
          }

					comic_embed.image = {url: img_link};
        } else {
          // send title and footer
					comic_embed.footer = {text: "It's probably interactive."};
        }
				s.showHomestuckPage(msg, comic_embed, usedArrowButton, "");
      }
    } else if (this.status == 404 && !got_error_already) {
      // send title and footer
      got_error_already = true;
			comic_embed.footer = {text: "It's probably missing page."};
			s.showHomestuckPage(msg, comic_embed, usedArrowButton, "");
    }
  }
  xhrHS.send(null);
}
export function CinemaPing(msg) {
	if (![ownerID, "184388744558673920", "378318866524143627", "178833086530846720"].includes(msg.author.id)) {
		return;
	}

	let cinemaPing = "";
	client.channels.get("541594001992581122").fetchMessage("542389154424553549")
		.then((message) => {
			message.reactions.get("📽").fetchUsers()
				.then((users) => {
					users.forEach(user => {
						cinemaPing += "<@" + user.id + ">\n";
					});
					cinemaPing += "Приглашаем вас на сегодняшний сеанс!";
					msg.channel.send(cinemaPing);
				})
				.catch(error => console.log(error));
		})
		.catch(error => console.log(error));
}
export function SnowflakeTime(msg, args) {
	let totalSFTimes = "";
	args.forEach(arg => {
		if (arg.match(/\d{17,20}/)) {
			let totalMatches = arg.match(/\d{17,20}/g);
			for (let i in totalMatches) {
				totalSFTimes += s.dateStr(s.sfTime(Number(totalMatches[i]))) + "\n";
			}
		}
	});
	if (totalSFTimes) {
		msg.channel.send(totalSFTimes);
	}
}
export function Stats(msg, args, msgCommandOriginal) {
	if (!s.isThisBotsChannel(msg)) {
		msg.react("🤖");
		return;
	}

	const statsLines = [
		"Servers: " + client.guilds.size,
		"Emojis: " + client.emojis.size,
		"Users cached: " + client.users.size,
		"Requests in this session: " + requestsCounter
	];

	const statsEmbed = {
		color: 0x888888,
		title: "Stats",
		description: statsLines.join("\n")
	}

	msg.channel.send({embed: statsEmbed});
}
