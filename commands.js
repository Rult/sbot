import * as s from "./secondary"
import {client, OWNER_ID, BOT_ID, visibleServers, userDB} from "./bot"

import got from "got"
import Cheerio from "cheerio"
import Intl from "intl"
import crypto from "crypto"

const Canvas = require('canvas')
const { Image } = require('canvas')

const imageRegex = /^http.+\.(png|jpe?g|bmp|gif|webp)/i
const imgDatabaseURL = "https://chaoscraft.ml/files/gallery/"

export const commands = {
	Help: {
		r: /^(х[еэ]лп|помо(щь|ги)|команды|help|comm?ands?)[.!]?$/,
		f (msg) {
			const helpLines = [
				"Чтобы спросить что-либо, обратись ко мне по имени и введи команду.",
				"Например: `сбот имг креатив намия` (в ЛС можно без обращения)",
				`Пустить меня на свой сервер можно по [этой ссылке](https://discordapp.com/api/oauth2/authorize?client_id=${BOT_ID}&scope=bot&permissions=0).`
			]
			const helpEmbed = {
				color: 0x7486C2,
				title: "Привет, меня зовут СтиллБот <:tuturuMetal:601419582837751810>",
				description: helpLines.join("\n"),
				fields: []
			}

			// collect descriptions
			let cmds = Object.keys(commands)
			for (let cmd of cmds) {
				let d = commands[cmd].d
				if (d) {
					helpEmbed.fields.push(d)
				}
			}
		
			msg.channel.send({embed: helpEmbed})
		}
	},
	Destroy: {
		r: /^(дестрой)[.!]?$/,
		f (msg) {
			if (msg.author.id == OWNER_ID) {
				console.log("Destroying client...")
				msg.author.send("🛌 🌌").then(() => {
					client.destroy().then(() => {
						console.log("Exiting process...")
						process.exit()
					})
				})
			}
		}
	},
	Img: {
		r: /^(пикча|имг|картинк?а|изображение|галерея|img|image|pic(ture)?|gallery)[.!,:]?$/,
		async f (msg, args) {
			let argsText = ""
		
			if (args.length > 0) {
				argsText = args.join(",")
				argsText = "?tags=" + encodeURIComponent(argsText)
			}
		
			try {
				let { body: imageInfo } = await got(`${imgDatabaseURL}random/${argsText}`, { json: true })
				if (imageInfo.error) throw Error(imageInfo.error)
			
				let imageExtension = imageInfo.tags.includes("gif") ? "gif" : "png"
				let imagePreview = `https://i.imgur.com/${imageInfo.id}t.jpg`
				await s.getMainColorFromImage(imagePreview, color => {
					msg.channel.send({
						embed: {
							color: color,
							author: {
								name: imageInfo.title,
								icon_url: "https://i.imgur.com/5EOhj0z.png",
								url: `https://stilltest.tk/gallery/#${imageInfo.id}`
							},
							description: `Теги: ${imageInfo.tags.join(", ")}`
								+ (imageInfo.date ? `\nДата: ${imageInfo.date}` : ""),
							image: {
								url: `https://i.imgur.com/${imageInfo.id}.${imageExtension}`
							}
						}
					})
				})
			} catch (err) {
				await msg.react("604015450304806952")
			}
		}
	},
	Skin: {
		r: /^(skin|скин)[.!]?$/,
		d: {
			name: "скин <ник>",
			value: "Ваш скин в майнкрафте.",
			inline: true
		},
		async f (msg, args) {

			let nick = args[0]

			if (!nick) {
				msg.channel.send('Нужен никнейм.')
				return
			}
			if (!nick.match(/^\w+$/)) {
				msg.channel.send('Ник может состоять только из латинских букв, цифр и знака `_`.')
				return
			}

			let { body: playerInfo } = await got(`https://api.mojang.com/users/profiles/minecraft/${nick}`, { json: true })
			if (playerInfo.error) throw Error(playerInfo.error)

			if (!playerInfo) {
				msg.channel.send(`Игрок с ником \`${nick}\` не найден.`)
				return
			}

			let uuid = playerInfo.id
			let { body: skinInfo } = await got(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`, { json: true })
			if (skinInfo.error) throw Error(skinInfo.error)

			try {
				let b64 = skinInfo.properties[0].value
				let skinValueData = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'))

				if (!Object.keys(skinValueData.textures).length) {
					msg.channel.send(`У игрока \`${playerInfo.name}\` нет скина :(`)
					return
				}

				let skinURL = skinValueData.textures.SKIN.url

				msg.channel.send({embed: {
					title: playerInfo.name.replace(/_/g, "\\_"),
					url: skinURL,
					image: {
						url: skinURL
					}
				}})
			} catch (err) {
				console.log(err)
				console.log(skinInfo)
			}


		}
	},
	React: {
		r: /^([пpрr]|поставь|отреагируй|реакция|react(ion)?)$/,
		f (msg, args, origCaseParams, isCommandCanBeAnEmoji) {
			if (!args[0]) {
				msg.react("📜")
				return false
			}

			s.deleteUserMessage(msg)
		
			let emojiName
			let guildName
		
			let guildCheck
		
			emojiName = s.getEmojiName(args.join(" "))
		
			let emojiError = ["👋", "😶", "🤔", "351002389991653378", "358952906248028160", "357960229259837440", "520641845634531328"]
		
			if (guildCheck = emojiName.match(/^([^:]+)(?::([\S\s]+))$/)) {
				emojiName = guildCheck[1]
				guildName = guildCheck[2]
			}

			let emoji = s.findEmoji(emojiName, guildName)
		
			if (emoji) {
				userDB[msg.author.id].reactionRequest = emoji
				msg.react("👌")
				return true
			} else {
				if (isCommandCanBeAnEmoji) {
					msg.react(getRandomElem(emojiError))
				} else {
					msg.react("604015450304806952")
				}
				return false
			}
			
		}
	},
	EmojiList: {
		r: /^(э(мо(д[жз]|ж)и)?|смайл(ики|ы)|emoji(s|list)?)[.!]?$/,
		f (msg, args, origCaseParams, usedArrowButton) {
			let defaultGuildId = "343851676404547585"
			let fromWhichServer = client.guilds.get(defaultGuildId)
			let askedServer = s.getGuild(args[0])
			let numberOfCurrentGuild = visibleServers.indexOf(defaultGuildId) + 1
		
			let goRight = false
			let goLeft = false
			if (args[0] == "+") {
				goRight = true
			} else if (args[0] == "-") {
				goLeft = true
			} else if (askedServer) {
				fromWhichServer = askedServer
				numberOfCurrentGuild = visibleServers.indexOf(askedServer.id) + 1
			}

			let possiblePrevId = msg.content.match(/(\d{17,20})\`$/)
		
			if (usedArrowButton && possiblePrevId) {
				let prevServer = possiblePrevId[1]
				let p = visibleServers.indexOf(prevServer)
				if (p > -1) {
					let n
					if (goRight) {
						n = p + 1
					} else if (goLeft) {
						n = p - 1
					}
					if (n < 0) {
						n = visibleServers.length - 1
					} else if (n >= visibleServers.length) {
						n = 0
					}
		
					numberOfCurrentGuild = n + 1
					fromWhichServer = client.guilds.get(visibleServers[n])
				}
			}
		
			let emServ = fromWhichServer
			if (emServ && emServ.emojis.size) {
				let embed = {
					color: 0xD4A940,
					fields: [
						{
							name: "1-1:",
							value: ""
						}
					],
					footer: {
						text: `📖 ${numberOfCurrentGuild}/${visibleServers.length}`
					}
				}
		
				let i = 0
				let f = 0
				let emojiDesc = "Доступные эмоджи:\n" + emServ.name + " `" + emServ.id + "`"
				let emojiList = []
		
				let fieldStart = 1
		
				emServ.emojis.forEach(key => {
					let prefix = "<:"
					let postfix = ">" + " `" + key.name + "`"
					if (key.animated) {
						prefix = "<a:"
					}
					if (++i % 10 == 1) {
						prefix = "\n" + prefix
					}
					let emojiInfo = prefix + key.name + ":" + key.id + postfix
					emojiList.push(emojiInfo)
					let emListText = emojiList.join(" ")
		
					if (f >= 6) {
						return
					} else if (emListText.length < 993) {
						embed.fields[f].name = fieldStart + "-" + i + ":"
						embed.fields[f].value = emListText
					} else {
						emojiList = []
						emojiList.push(emojiInfo)
						if (emojiInfo.length < 993) {
							fieldStart = i
							f++
							embed.fields[f] = {}
							embed.fields[f].name = fieldStart + "-" + i + ":"
							embed.fields[f].value = emojiInfo
						}
					}
				})
		
				if (usedArrowButton) {
					msg.edit(emojiDesc, {embed: embed})
				} else {
					msg.channel.send(emojiDesc, {embed: embed})
						.then((msg) => {
							msg.react("⬅")
								.then(() => {
									msg.react("➡")
								})
								.catch(error => console.log(error))
						})
						.catch(error => console.log(error))
				}
			}
		
			return
		}
	},
	Sticker: {
		r: /^(с(тикер)?|s(ticker)?|э(мо(д[жз]|ж)и)?линк|e(moji)?link)$/,
		async f (msg, args) {
			if (!args[0]) {
				msg.react("📜")
				return
			}
		
			let emoji
		
			if (args[0].match(/^\d+$/g) && client.emojis.get(args[0])) {
				emoji = client.emojis.get(args[0])
			} else {
				let emojiName = s.getEmojiName(args[0])
				let guildName
				let guildCheck
				if (guildCheck = emojiName.match(/^([^:]+)(?::(\S+))$/)) {
					emojiName = guildCheck[1]
					guildName = guildCheck[2]
				}
				emoji = s.findEmoji(emojiName, guildName)
			}
		
			if (!emoji) {
				msg.react("604015450304806952")
				return
			}

			let imageLink = `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? "gif" : "png"}`

			await s.getMainColorFromImage(imageLink, color => {
				msg.channel.send({
					embed: {
						color: color,
						description: `<${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}> – ${emoji.name}`, 
						image: {
							url: imageLink
						}
					}
				})
			})
		}
	},
	Avatar: {
		r: /^(ав(атар(ка)?|к?а)|ava(tar)?|pfp)[.!]?$/,
		d: {
			name: "ава [никнейм или айди юзера]",
			value: "Глянуть чью-то авку.",
			inline: true
		},
		async f (msg, args, origCaseParams, justGetLinks) {
			let user
			if (args[0] == "random") {
				user = client.users.filter(u => u.avatar).random()
			} else if ( ["sb", "sbot", "сб", "сбот"].includes(args[0]) ) {
				user = client.users.get(BOT_ID)
			} else if (args[0]) {
				user = await s.findUser(origCaseParams.args)
			} else {
				user = msg.author
			}
		
			if (!(user && user.avatar)) {
				msg.react("604015450304806952")
				return false
			}
		
			let fullSizeLink = user.avatarURL().split("?size=")[0] + "?size=2048"
			let link = user.avatarURL().split("?size=")[0] + "?size=128"

			if (justGetLinks) {
				return [fullSizeLink, link]
			}

			await s.getMainColorFromImage(link, color => {
				msg.channel.send({embed: {
					color: color, 
					description: user.tag, 
					image: {
						url: fullSizeLink
					}
				}})
			})

		}
	},
	Invite: {
		r: /^(приглашение|инвайт|invite)[.!]?$/,
		f (msg, args) {
			let id_to_invite = BOT_ID
			if (!isNaN(args[0])) {
				id_to_invite = args[0]
			}
			let text_who_to_invite = "меня"
			if (id_to_invite != BOT_ID) {
				text_who_to_invite = "его"
			}
			msg.author.send(`Ты можешь пустить ${text_who_to_invite} на свой сервер с помощью этой ссылки: \n<https://discordapp.com/api/oauth2/authorize?scope=bot&permissions=0&client_id=${id_to_invite}>`)
				.then(() => {
					s.envelope(msg)
				})
				.catch(error => console.log(error))
		}
	},
	Homestuck: {
		r: /^(hs|хс|хоумстак|homestuck)[.!]?$/,
		d: {
			name: "хс [номер_страницы]",
			value: "Почитать [Хоумстак](https://www.homestuck.com/).",
			inline: true
		},
		async f (msg, args, origCaseParams, usedArrowButton) {
			let page_number
			let contentText = ""

			let domain = 'https://www.homestuck.com'
			let hs_part_mark = "hs#"
			let text_location = "p.type-rg"
		
			let num = Number(args[0])

			if (args[0]) {
				if (num >= 1 && num <= 8130) {
					page_number = args[0]
				} else if (num > 8130) {
					page_number = num % 8130
				} else {
					return
				}
			} else {
				page_number = 1
			}

			if (args[1] == "2" || num > 8130) {
				domain = 'https://www.homestuck2.com'
				hs_part_mark = "hs2#"
				text_location = 'div.type-rg'
			}
		
			let page_link = domain + '/story/' + page_number
			let comic_number = hs_part_mark + page_number
			let got_error_already = false
			let embed_color = 0x249E28
		
			let comic_embed = {
				color: embed_color,
				author: {
					url: page_link,
					name: comic_number
				}
			}
		
			try {
				let hs = await got(page_link, {
					headers: {
						"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:62.0) Gecko/20100101 Firefox/62.0"
					}
				})
		
				let $ = Cheerio.load(hs.body)
		
				let content_container = $('div#content_container')
				let flash_div = $('div#o_flash-container')
		
				// detecting video
				let is_there_video = false
				let yt_link = ""
				let yt_link_code
		
				if (flash_div.length) {
					let yt_raw = flash_div.html().match(/\'youtubeid\', \'(.+)\'/)
					if (yt_raw) {
						yt_link_code = yt_raw[1]
					}
				} else {
					let yt_raw = $('iframe.ar-inner').attr('src')
					if (yt_raw) {
						yt_link_code = yt_raw.match(/embed\/(.+)/)[1]
					}
				}
				if (yt_link_code) {
					yt_link = `https://youtu.be/${yt_link_code}`
					is_there_video = true
				}
		
		
				if (is_there_video) {
					// send title, desc and video link
					comic_embed = {}
					contentText = comic_number + "\n" + yt_link
				} else {
					// getting title
					let comic_title = $('h2.type-hs-header').text()
					if (comic_title && !is_there_video) {
						comic_title = `${comic_title} (${comic_number})`
					} else {
						comic_title = comic_number
					}
					comic_embed.author.name = comic_title
		
					// getting description
					let desc = $(text_location).text().replace(/\ +/g, " ").replace(/^\s+/, "").replace(/\s+$/, "")
					let desc_limit = 2047
					if (desc.length > desc_limit) {
						desc = desc.substring(0, desc_limit) + "…"
					} else if (desc.length == 0) {
						desc = ""
					}
					comic_embed.description = desc
		
					// getting images
					let imgs
					let img_link = ""
					let is_img_from_flash = false
					if (content_container.length) {
						imgs = content_container.find('img.mar-x-auto.disp-bl')
						if (!imgs.length) {
							let imgs_raw = $('div.bg-scratch-mid-green.pad-t-lg').find('img')
							if (imgs_raw.length) {
								imgs = imgs_raw.attr('src')
								is_img_from_flash = true
							}
						}
					} else {
						imgs = $('img.mar-x-auto.disp-bl')
					}
					if (flash_div.length && !imgs.length) {
						let imgs_raw = flash_div.html().match(/\'altimgsrc\', \'(.+)\'/)
						if (imgs_raw) {
							imgs = imgs_raw[1]
							is_img_from_flash = true
						}
					}
					if (imgs.length) {
						// send title, image and desc
						if (is_img_from_flash) {
							img_link = `${domain}${imgs}`
						} else if (imgs.attr('src').startsWith("/")) {
							img_link = `${domain}${imgs.attr('src')}`
						} else {
							img_link = imgs.attr('src')
						}
		
						comic_embed.image = {url: img_link}
					} else {
						// send title and footer
						comic_embed.footer = {text: "It's probably interactive."}
					}
				}
			} catch (err) {
				if (err.statusCode === 404) {
					comic_embed.footer = {text: "It's probably missing page."}
				}
			}
			
			let embed = {embed: comic_embed}
			if (usedArrowButton) {
				if (contentText) {
					msg.edit(contentText, embed)
				} else {
					msg.edit(embed)
				}
			} else {
				let contentToSend = (contentText) ? contentText : embed
				msg.channel.send(contentToSend).then((msg) => {
					msg.react("⬅").then(() => {
						msg.react("➡").then(() => {
							msg.react("🔃")
						})
						.catch(error => console.log(error))
					})
					.catch(error => console.log(error))
				})
				.catch(error => console.log(error))
			}

		}
	},
	SnowflakeTime: {
		r: /^(снежинк[аи]|sftime|сфтайм)[.!]?$/,
		d: {
			name: "снежинка <дискорд-айди>",
			value: "Время снежинки.",
			inline: true
		},
		f (msg, args) {
			if (!args[0]) {
				msg.channel.send('Введите дискорд-айди!')
				return
			}
			let totalSFTimes = []
			args.forEach(arg => {
				if (arg.match(/\d{17,20}/)) {
					let totalMatches = arg.match(/\d{17,20}/g)
					for (let i in totalMatches) {
						totalSFTimes.push(s.timeToString(s.sftime(totalMatches[i])))
					}
				}
			})
			if (totalSFTimes) {
				msg.channel.send(totalSFTimes.join("\n"))
			}
		}
	},
	Stats: {
		r: /^(stats|статы|статистика|ап(тайм)?|up(time)?)[.!]?$/,
		f (msg) {
			let uptimeResult
			let u = client.uptime
			if (u > 1000) {
				let diff = u
				let tarr = [1000, 60, 60, 24]
				for (let i in tarr) {
					let x = tarr[i]
					tarr[i] = diff % x
					diff = (diff - tarr[i]) / x
				}
				tarr.push(diff)
				tarr.shift()
				let warr = [
					['секунду', 'секунды', 'секунд'],
					['минуту', 'минуты', 'минут'],
					['час', 'часа', 'часов'],
					['день', 'дня', 'дней'],
				]
				let sarr = []
				for (let i = tarr.length - 1; i >= 0; i--) {
					if (!tarr[i]) {
						continue
					}
					sarr.push(tarr[i] + ' ' + s.pluralize(tarr[i], warr[i]))
				}
				uptimeResult = `Я работаю уже ${sarr.join(', ')}.`
			} else {
				uptimeResult = `Я только зашёл.`
			}

			const statsEmbed = {
				color: 0x888888,
				title: "Статистика",
				description: uptimeResult,
				footer: {
					text: `${process.env.npm_package_version} | 🗄 ${client.guilds.size} | 😶 ${client.emojis.size} | 👥 ${client.users.size}`
				}
			}
		
			msg.channel.send({embed: statsEmbed})
		}
	},
	When: {
		r: /^(когда)[.!]?$/,
		f (msg, args, origCaseParams) {
			if (!origCaseParams.args[0]) {
				msg.reply("Мир опустеет 14 июля 2149 года. Тогда и появится Железная Дверь. \nВозможно, вы хотели спросить что-то конкретное?")
				return
			}
		
			let questionOriginal = origCaseParams.args.join(" ").replace(/[.!?]+$/, "")
			let question = s.getSimpleString(questionOriginal)
		
			let epochStart = 18424
			let epochEnd = 65573
			let T = epochEnd - epochStart
		
			let hex = crypto.createHash('md5').update(question).digest("hex")

			let days = Math.floor(Math.pow(((parseInt(hex, 16) % T) / T), 6) * T) + epochStart
			if (question.match(/(железн(ая|ой|ую) двер(ь|и)|конец света|армагеддон|апокалипсис)/)) {
				days = epochEnd
			}
		
			let dateOptions = {year: "numeric", month: "long", day: "numeric"}
			let dateText
		
			if (days == epochStart) {
				dateText = "Сегодня."
			} else if (days == epochStart + 1) {
				dateText = "Завтра."
			} else if (days > epochEnd - 1000 && days < epochEnd) {
				dateText = "Никогда."
			} else if (question == "когда") {
				dateText = "Тогда."
			} else {
				dateText = new Intl.DateTimeFormat("ru", dateOptions).format(new Date(days*86400*1000))
			}
			let whenEmbed = {
				description: "🗓 " + dateText
			}
		
			msg.reply({embed: whenEmbed})
		}
	},
	IronDoor: {
		r: /^(железнаядверь|жд)[.!]?$/,
		f (msg, args, origCaseParams) {
			let answer = "..."

			if (args[0] == "когда") {
				origCaseParams.args.shift()
				commands.When.f(msg, args, origCaseParams)
				return
			}
		
			let possibleAnswers = [
				"Бесспорно.", 
				"Определённо, да.",
				"Без сомнения.",
				"Конечно.",
		
				"Думаю, да.",
				"Наверное.",
				"Вполне вероятно.",
				"Возможно, так и есть.",
				"А сам как думаешь?",
		
				"ХЗ, вообще.",
				"Вселенная не может подсказать мне сейчас.",
				"Неясно.",
				"Попробуй сформулировать вопрос по-другому.",
				"Может быть.",
				"Не могу сейчас сказать точно.",
				"Попробуй подумать сам.",
				"Что за странный вопрос?",
				"Не могу сказать сейчас.",
				"Лучше бы тебе не знать об этом.",
				"Откуда мне знать?",
				"50 на 50.",
		
				"Скорее всего, нет.",
				"Да вряд ли.",
				"Маловероятно.",
				"Вероятность - околонулевая.",
		
				"Конечно, нет.",
				"Мои источники говорят: \"нет\".",
				"Вероятность - нулевая.",
				"Вселенная так не думает."
			]

			if (args[0]) {
				answer = s.getRandomElem(possibleAnswers)
			}
		
			let embed = {
				author: {
					name: answer,
					icon_url: "https://i.imgur.com/P8IAywM.png"
				}
			}
		
			msg.reply({embed: embed})
		}
	},
	Three: {
		r: /^-?(\d+)[.!]?$/,
		f (msg, args, origCaseParams) {
			if (!args[0]) {
				args.unshift(msg.content.split(/\s+/).slice(-1)[0])
				commands.React.f(msg, args, false)
				return
			}
		
			let num = parseInt(origCaseParams.cmd)
		
			if (!num && num !== 0) {
				return
			} else if (num < 1) {
				msg.channel.send("No emoji for you!")
				return
			}
		
			let e = ''
			for (let arg of args) {
				let emojiName = s.getEmojiName(arg)
				let guildName
				let guildCheck
			
				if (guildCheck = emojiName.match(/^([^:]+)(?::(\S+))$/)) {
					emojiName = guildCheck[1]
					guildName = guildCheck[2]
				}
			
				let emoji = s.findEmoji(emojiName, guildName)
			
				if (!emoji) {
					msg.react('604015450304806952')
					return
				}

				let prefix = "<:"
				let postfix = "> "
				if (emoji.animated) {
					prefix = "<a:"
				}
			
				e += prefix + emoji.name + ":" + emoji.id + postfix
			}
			
			let result = e.repeat(num)
			
			if (result.length <= 2000) {
				msg.channel.send(result)
			} else {
				msg.channel.send("Too much!")
			}
			
		}
	},
	EmojiMatch: {
		r: /^(эмод[жз]и(лист|м[эа]тч)|(match|find)(emojis?)?)$/,
		f (msg, args, origCaseParams) {
			if (!args[0]) {
				args.unshift(msg.content.split(/\s+/).slice(-1)[0])
				commands.React.f(msg, args, false)
				return
			}
			
			let emojiName = args[0]
			
			let emojisFull = []
			let emojisStarts = []
			let emojisIncludes = []
			
			client.emojis.forEach(key => {
				let currName = key.name.toLowerCase()
				if (emojiName == currName) {
					emojisFull.push(key)
				} else if (currName.startsWith(emojiName)) {
					emojisStarts.push(key)
				} else if (currName.includes(emojiName)) {
					emojisIncludes.push(key)
				}
			})
			
			let emojis = emojisFull.concat(emojisStarts, emojisIncludes)
			
			if (emojis.length == 0) {
				// nothing found at all
				msg.react('604015450304806952')
				return
			}
			
			let results = 'Поиск по `' + emojiName + '`:'
			
			for (let emoji of emojis) {
				let prefix = "<:"
				let postfix = "> "
				if (emoji.animated) {
					prefix = "<a:"
				}
				
				let emojiText = prefix + emoji.name + ':' + emoji.id + postfix
				
				let servText = emoji.guild.name
				
				if (args[1] && args[1] == 'serv_id') {
					servText += ' (' + emoji.guild.id + ')'
				}

				let itemText = '\n' + emojiText + ' `' + emoji.name + '` ' + servText
				
				if (results.length + itemText.length >= 2000 - 10) {
					results += '\n...'
					break
				}
				
				results += itemText
			}
			
			msg.channel.send(results)
		}
	},
	Rtfm: {
		r: /^(rtfm|man|docs?)[.!]?$/,
		async f (msg, args, origCaseParams) {
			if (!args[0] || !args[1]) {
				msg.channel.send("Укажите в команде, какие доки вам нужны (js, py, jda) и какой метод/событие ищите.")
				return
			}
		
			let lang = args[0]
			let query = origCaseParams.args[1]
		
			let [, docsClass, docsMethod] = query.match(/^(\w+)(?:\.([\w\.]+))?/)
			docsClass = docsClass[0].toUpperCase() + docsClass.slice(1);
		
			let link
		
			if (["js", "javascript", "node", "nodejs", "discord.js"].includes(lang)) {
				link = `https://discord.js.org/#/docs/main/stable/class/${docsClass}`
				if (docsMethod) link += `?scrollTo=${docsMethod}`
			} else if (["py", "python", "discord.py"].includes(lang)) {
				if (docsClass.toLowerCase() == "commands") {
					link = `https://discordpy.readthedocs.io/en/latest/ext/commands/api.html#discord.ext.commands`
				} else if (docsClass.toLowerCase() == "tasks") {
					link = `https://discordpy.readthedocs.io/en/latest/ext/tasks/index.html#discord.ext.tasks`
				} else {
					link = `https://discordpy.readthedocs.io/en/latest/api.html#discord.${docsClass}`
				}
				if (docsMethod) link += `.${docsMethod}`
			} else if (["java", "jda"].includes(lang)) {
				let queryParts = query.split(".")
				if ( !["annotations", "bot", "core", "client", "webhook"].includes(queryParts[0]) ) {
					queryParts.unshift("core", "events")
				}
				let possibleEvent = queryParts[queryParts.length - 1]
				if (possibleEvent[0] == possibleEvent[0].toUpperCase() || possibleEvent.toLowerCase().endsWith("event")) {
					queryParts[queryParts.length - 1] = possibleEvent[0].toUpperCase() + possibleEvent.slice(1);
				} else {
					queryParts.push("package-summary")
				}
				for (let i = 0; i < queryParts.length - 1; i++) {
					queryParts[i] = queryParts[i].toLowerCase()
				}
		
				link = `https://ci.dv8tion.net/job/JDA/javadoc/net/dv8tion/jda/${queryParts.join("/")}.html`
			}
		
			try {
				await got(link).then(response => {
					let linkPartsPy = link.split("#")
					if (lang == "py" && linkPartsPy[1]) {
						if (!response.body.includes(`id=\"${linkPartsPy[1]}\"`)) throw "NotFoundError"
					} 
				})
				if (lang == "js") {
					await got("https://raw.githubusercontent.com/discordjs/discord.js/docs/stable.json").then(response => {
						if (!response.body.includes(`"path":"src/structures"}},{"name":"${docsClass}"`)) throw "NotFoundError"
						if (docsMethod) {
							if (!response.body.includes(`"path":"src/structures"}},{"name":"${docsMethod}"`)) throw "NotFoundError"
						}
					})
				}
				msg.channel.send(`📜 <${link}>`)
			} catch (err) {
				msg.channel.send(`Документации на такое нет...`)
			}
			
		}
	},
	Dividers: {
		r: /^(dividers|разложи|primecheck)[.!]?$/,
		f (msg, args) {
			if (!args[0]) {
				msg.channel.send('Введите число!')
				return
			}
			
			let start = new Date()
			let a = args[0]

			// code below by PLAYER_CHAR https://chaoscraft.ml/tools/numbers/

			if (a.match(/e/i)) {
				// экспоненциальная запись неудобна для проверки
				msg.channel.send('Введите число в обычной форме!')
				return
			}

			// если это десятичная дробь, то считаем десятки в минус
			let ten = 0
			let parts = a.split('.')
			let ns = parts[0]
			if (parts[1]) {
				let frac = parts[1].replace(/0+$/, '')
				ns += frac
				ten = frac.length
			}

			// z - целое число, k - число для вывода в конце
			let z = +ns
			let k = String(z / Math.pow(10, ten))

			if (!isFinite(z)) {
				// ввели бред
				msg.channel.send('Ты втираешь мне какую-то дичь')
				return
			}
			if (!Number.isSafeInteger(Math.floor(z))) {
				// число большое, оно может округлиться
				if (ten) {
					msg.channel.send('Слишком много цифр, будут ошибки в округлении')
				} else {
					msg.channel.send('Число слишком большое')
				}
				return
			}

			// тривиальные варианты
			if (z == 0) {
				msg.channel.send('Введите число, отличное от нуля')
				return
			}
			if (z == 1) {
				msg.channel.send('1 не имеет простых делителей')
				return
			}

			// p - ассоциативный массив простых чисел
			// число "-1" в нём сортируется отстойно, сдвинем всё на единицу
			let p = {}

			// если z отрицательное, то кидаем сразу -1
			if (z < 0) {
				// да-да, мы сдвинули, 0 означает "-1"
				p[0] = 1
				z *= -1
			}

			// проверка, делится ли n на l
			function divable(n, l) {
				let s = n / l
				return (s == Math.trunc(s))
			}

			// процедура деления z на n
			function div(n) {
				if (n > s) {
					// дальше корня ничего не будет
					if (z != 1) {
						// выделяем оставшееся простое число
						p[z + 1] = 1
					}
					// всё, доделились
					throw 0
				}
				if (divable(z, n)) {
					// если делится, то делим
					let l = 0
					do {
						// делим его на n, пока делится
						l++
						z /= n
					} while (divable(z, n))
					
					// записываем результат
					p[n + 1] = l
					if (z < 2) {
						// всё, доделились
						throw 0
					}
					s = Math.floor(Math.sqrt(z))
				}
			}

			// n - текущее простое число
			let n = 3
			// s - предельное значение
			let s = Math.floor(Math.sqrt(z))

			// делим, пока не выделится всё
			try {
				// двойку проверяем отдельно
				div(2)
				while (true) {
					// далее тупо проверяем все нечётные
					div(n)
					n += 2
				}
				// под конец div() рано или поздно выкинет исключение
			} catch(e) {}

			// расплачиваемся, если это была десятичная дробь
			if (ten) {
				// двойки
				p[3] = p[3] ? p[3] - ten : -ten
				// пятёрки
				p[6] = p[6] ? p[6] - ten : -ten
			}

			const powers = "⁰¹²³⁴⁵⁶⁷⁸⁹"
			let result

			// теперь выписываем всё это
			let str = ''
			for (n in p) {
				if (!p[n]) {
					// если 0.5 и тому подобное, то появится 5^0, которое не нужно
					continue
				}
				if (str) {
					// знак умножения между множителями
					str += ' × '
				} else
				if (n - 1 == k) {
					// если число простое
					result = k + ' - простое число'
				}
				// приписываем множитель
				str += n - 1
				// пишем его степень
				if (p[n] != 1) {
					str += Array.from((p[n]).toString()).map(x => powers[x] ? powers[x] : '⁻').join("")
				}
			}
			result = (result) ? result : k + ' = ' + str

			let end = new Date()

			let resultEmbed = {
				title: result,
				footer: {
					text: `Вычислено за ${end - start} мс`
				}
			}

			msg.channel.send({embed: resultEmbed})

		}
	},
	Uwuify: {
		r: /^((uwu|owo)(ify)?)[.!]?$/,
		f (msg, args) {
			if (!args[0]) {
				msg.channel.send('pwease entew some text uwu')
				return
			}

			let t = args.join(" ")
			t = t.replace(/th([aiueo])/g, 'd$1')
			t = t.replace(/[rl]/g, 'w')
			t = t.replace(/([aiueo])t/g, '$1wt')
			t = t.replace(/\!/g, ' uwu')
			t = t.replace(/\'/g, '')

			msg.channel.send(t)
		}
	},
	Coffee: {
		r: /^(кофе|coff?ee?)[.!]?$/,
		async f (msg, args, origCaseParams) {

			let botMessage
			let foamImageURL = msg.author.avatarURL

			let nick = (msg.channel.type != "dm") ? msg.member.displayName : msg.author.username

			if (msg.attachments.size) {
				let att = msg.attachments.first()
				if (att.width) { // test if att is an image
					foamImageURL = att.url
				}
			} else if (origCaseParams.args[0]) {
				foamImageURL = origCaseParams.args[0]
			}

			const canvas = Canvas.createCanvas(1280, 853)

			function findIndex256(arr, v) {
				let a = 0
				let b = 256
				while (b - a > 1) {
					let c = (a + b) >> 1
					if (arr[c] < v) {
						a = c
					} else {
						b = c
					}
				}
				return a
			}

			const imc = new Image()
			imc.onload = async () => {
				const imb = new Image()
				if (!foamImageURL.match(imageRegex)) {
					let avatarLinks = await commands.Avatar.f(msg, args, origCaseParams, true)
					if (avatarLinks) {
						foamImageURL = avatarLinks[0]
					} else {
						msg.channel.send("Принимаем только картинки.")
						return
					}
				}
				imb.src = foamImageURL
				imb.onload = async () => {
					await msg.channel.send("Начинаю варить...").then(async (m) => {
						botMessage = m
					})

					let x0 = 152
					let x1 = 715
					let y0 = 270
					let y1 = 520
					let w = x1 - x0
					let h = y1 - y0

					const sw = imb.width
					const sh = imb.height
					const sR = (sw/sh < 1) ? true : false

					const sx = (sR) ? 0 : (sw-sh)/2
					const sy = (sR) ? (sh-sw)/2 : 0
					const sWidth = (sR) ? sw : sh
					const sHeight = (sR) ? sw : sh
					
					let cuptop = canvas
					cuptop.width = w
					cuptop.height = h
					let cuptopbm = cuptop.getContext('2d')
					cuptopbm.filter = 'blur(1.1px)'
					cuptopbm.drawImage(imb, sx, sy, sWidth, sHeight, 0, 0, w, h)
					cuptopbm.filter = 'none'
					cuptopbm.globalAlpha = 0.5
					cuptopbm.drawImage(imb, sx, sy, sWidth, sHeight, 0, 0, w, h)
					cuptopbm.globalAlpha = 1
					let data = cuptopbm.getImageData(0, 0, w, h)
					let dat = data.data
					
					let counts = new Float64Array(256)
					let counttotal = 0.0
					
					for (let j = 0; j < h; j++) {
						for (let i = 0; i < w; i++) {
							// compute dist from center
							let o = (i + j * w) << 2
							let x = ((i + 0.5) / w) * 2 - 1
							let y = ((j + 0.5) / h) * 2 - 1
							let r2 = x * x + y * y
							// set opacity
							let q = r2 > 1 ? 0.0 : 1 - 3 * r2 ** 24 + 2 * r2 ** 36
							let opacity = dat[o + 3] * q
							dat[o + 3] = Math.round(opacity)
							
							// count
							counttotal += opacity
							counts[Math.round(dat[o] * 0.4 + dat[o + 1] * 0.4 + dat[o + 2] * 0.2)] += opacity
						}
					}
					let countsum = 0.0
					for (let i = 0; i < 256; i++) {
						countsum += counts[i] / counttotal
						counts[i] = countsum
					}
					let min = findIndex256(counts, 0.01) / 256
					let med = findIndex256(counts, 0.50) / 256
					let max = findIndex256(counts, 0.95) / 256
					let median = ((min + 2 * med + max) / 4 - min) / (max - min)
					
					for (let j = 0; j < h; j++) {
						for (let i = 0; i < w; i++) {
							let o = (i + j * w) << 2
							if (dat[o + 3] == 0) {
								continue
							}
							// recolor
							
							let l = (dat[o] * 0.4 + dat[o + 1] * 0.4 + dat[o + 2] * 0.2) / 256
							//l = (l - min) / (max - min)
							l = l + (1 - max)
							l = Math.max(Math.min(l, 1), 0)
							l = l ** median
							
							let currRandom = 0
							for (let k = 0; k < 40; k++) {
								currRandom += Math.random()
							}
							currRandom = (currRandom - 20) / 10
							l = Math.max(Math.min(1, l + 0.07 * currRandom), 0)
							
							let r = 0.25 + 0.65 * (1 - (1 - l) ** 1.5)
							let g = 0.07 + 0.85 * l ** 1.25
							let b = l ** 3
							
							dat[o + 0] = Math.round(r * 255)
							dat[o + 1] = Math.round(g * 255)
							dat[o + 2] = Math.round(b * 255)
						}
					}
					
					cuptopbm.putImageData(data, 0, 0)
					
					let result = Canvas.createCanvas(1280, 853)
					result.width = imc.naturalWidth
					result.height = imc.naturalHeight
					let resultbm = result.getContext('2d')
					resultbm.drawImage(imc, 0, 0)
					resultbm.drawImage(cuptop, x0, y0, w, h)
					
					const buf = result.toBuffer('image/png')
					msg.channel.send(`Ваш кофе готов, ${nick}. Прошу... <:hatKid:562284260149428224>`, {
						files: [{
							attachment: buf,
							name: "coffee.png"
						}]
					}).then(async () => {
						botMessage.delete()
					})
				}
				imb.onerror = err => {
					throw err 
				}
			}
			imc.onerror = err => { throw err }
			imc.src = "pics/coffeecup.png"

		}
	},
	Palette: {
		r: /^(палитра|palette)[.!]?$/,
		d: {
			name: "палитра + прикреплённое изображение 📎",
			value: "Считать цвета с картинки.",
			inline: true
		},
		async f (msg, args, origCaseParams) {
			let usingAvatar = false
			let imagePreview

			if (!msg.attachments.size) {
				let avatarLinks = await commands.Avatar.f(msg, args, origCaseParams, true)
				if (avatarLinks) {
					usingAvatar = true
					imagePreview = avatarLinks[1]
				} else {
					msg.channel.send("Нужно прикрепить картинку к сообщению!")
					return
				}
			}

			let cnum = parseInt(args[0])
			if (!cnum || cnum < 1) {
				cnum = 20
			} else if (cnum > 100) {
				cnum = 100
			}

			if (!usingAvatar) {
				let att = msg.attachments.first()			
				let max = 128
				let w = max
				let h = max
				if (att.width > att.height) {
					h = Math.round(att.height / (att.width / max))
				} else {
					w = Math.round(att.width / (att.height / max))
				}
				imagePreview = `https://media.discordapp.net/attachments/${msg.channel.id}/${att.id}/${att.filename}?width=${w}&height=${h}`
			}

			await s.getMainColorFromImage(imagePreview, (color, palette) => {
				let hexColors = []
				let hexRows = []

				let rowLength = 5
				let segmentW = 70
				let segmentH = 25
				let canvasW = segmentW * rowLength
				let canvasH = Math.ceil(cnum / rowLength) * segmentH

				const canvas = Canvas.createCanvas(canvasW, canvasH)
				const ctx = canvas.getContext('2d')
				for (let i = 0; i < palette.length; i++) {
					let hex = palette[i].toString(16)
					let tempHex = `00000${hex}`
					hex = `#${tempHex.slice(-6)}`
					hexColors.push(hex)
					let x = i % rowLength
					let y = Math.floor(i / rowLength)
					ctx.fillStyle = hex
					ctx.fillRect(segmentW*x, segmentH*y, segmentW, segmentH)
				}
				const buf = canvas.toBuffer('image/png')

				for (let i = 0; i < hexColors.length; i+=5) {
					hexRows.push(hexColors.slice(i, i+5).join(" "))
				}
				msg.channel.send(`\`\`\`${hexRows.join("\n")}\`\`\``, {
					files: [{
						attachment: buf,
						name: "palette.png"
					}]
				})
			}, cnum)
			
		}
	},
	Recolor: {
		r: /^(реколор|recolor)[.!]?$/,
		async f (msg, args) {
			if (!args.length) {
				msg.channel.send("Нужно указать цвета! Например, `#d51a24 #7ca4af #f8dfa8 #05324a`")
				return
			}
			if (!msg.attachments.size) {
				msg.channel.send("Нужно прикрепить картинку к сообщению!")
				return
			}

			let pal = []
			for (let i = 0; i < args.length; i++) {
				pal.push(parseInt(args[i].slice(-6), 16)*256 + 255)
			}
			msg.attachments.forEach(async (att) => {
				let max = 1024
				let w = max
				let h = max
				if (att.width > att.height) {
					h = Math.round(att.height / (att.width / max))
				} else {
					w = Math.round(att.width / (att.height / max))
				}
				let imagePreview = `https://media.discordapp.net/attachments/${msg.channel.id}/${att.id}/${att.filename}?width=${w}&height=${h}`

				await s.recolorByPalette(imagePreview, pal, buf => {
					msg.channel.send({
						files: [{
							attachment: buf,
							name: "recolored.png"
						}]
					})
					.then(() => {})
					.catch(error => {
						console.log(error)
					})
				})
			})

		}
	},
	Boring: {
		r: /^(ску+[чшщ]н[оа]+|груст?н[оа]|д[еи]пресс?ия)[.!]?$/,
		d: {
			name: "скучно",
			value: "Найти себе занятие.",
			inline: true
		},
		f (msg) {
			let boringTasks = [
				"Посмотри Коносубу \nhttps://anilist.co/anime/21202/Kono-Subarashii-Sekai-ni-Shukufuku-wo/",
				"Посмотри Жожу \nhttps://anilist.co/anime/14719/JoJo-no-Kimyou-na-Bouken/",
				"Посмотри Психопасс \nhttps://anilist.co/anime/13601/PSYCHOPASS/",
				"Посмотри Танечку \nhttps://anilist.co/anime/21613/Youjo-Senki/",
				"Поиграй в Шляпу во Времени \nhttps://store.steampowered.com/app/253230/A_Hat_in_Time/",
				"Поиграй в Вальхаллу \nhttps://store.steampowered.com/app/447530/VA11_HallA_Cyberpunk_Bartender_Action/",
				"Поиграй в Античембер \nhttps://store.steampowered.com/app/219890/Antichamber/",
				"Поиграй в Притчу Стэнли \nhttps://store.steampowered.com/app/221910/The_Stanley_Parable/",
				"Установи Арч на виртуалку \nhttps://wiki.archlinux.org/index.php/Installation_guide",
				"Поучаствуй в проекте Common Voice от Мозиллы \nhttps://voice.mozilla.org/ru/",
				"Попробуй решить пару головоломок \nhttps://projecteuler.net/recent",
				"Напиши игру на Юнити \nhttps://youtu.be/A-GkNM8M5p8",
				"Время научиться учить английский правильно \nhttps://habr.com/ru/post/493522/",
				"Напиши что-нибудь на мобилку \nhttps://metanit.com/java/android/1.2.php"
			]

			msg.channel.send(s.getRandomElem(boringTasks))
		}
	},
	Rulet: { // by PLAYER_CHAR
		r: /^(rulet|рулет)[.!]?$/,
		f (msg, args) {
			let size = (args[0]) ? Number(args[0]) : 7
			let maxSize = 15

			if (Number.isNaN(size)) {
				let bananaRulet = 'A baNaNa rulet specially for you!\n```\n' + [
					"   ██████████",
					" ███🍌🍌🍌███",
					"███🍌████🍌███",
					"██🍌██🍌██🍌██",
					"██🍌███🍌🍌███",
					" ██🍌████████",
				].join('\n') + '\n```'
				
				msg.channel.send(bananaRulet)
				return
			}
			if (size == 0) {
				msg.channel.send("can i offer you a nice egg in this trying time? 🥚")
				return
			}

			size = ~~size // cast to integer
	
			if (!size) {
				msg.channel.send("Invalid rulet size!")
				return
			}

			let negative = size < 0
			size = size < 0 ? -size : size
			size = size > maxSize ? maxSize : size
			let startSize = size > 1 ? 2 : size
			let ruletic = [new Array(startSize).fill(1)]
			
			// add layer by layer
			for (let currSize = startSize; currSize < size; currSize++) {
				let width = ruletic[0].length
				
				let nachinka = new Array(width).fill(0)
				nachinka[0] = 1
				ruletic.push(nachinka)
				
				let corka = new Array(width).fill(1)
				ruletic.push(corka)
				
				// rotate 90 degrees clockwise
				ruletic = ruletic[0].map((_, i) => ruletic.map(row => row[i]).reverse())
			}
			
			let chars = ['░', '█']
			if (negative) {
				chars = chars.reverse()
			}
			let outerChar = ' '
			
			// convert numbers to chars
			let width = ruletic[0].length
			let height = ruletic.length
			ruletic = ruletic.map((row, j) => row.map((n, i) => {
				let primary = chars[n]
				let outer = i == 0 || i == width - 1
				let rBorder = (i != 0) && (row[i - 1] == n)
				let lBorder = (i != width - 1) && (row[i + 1] == n)
				if ((rBorder && lBorder) || size <= 2) {
					// inside the line
					rBorder = false
					lBorder = false
				}
				if ((i <= 1) && (j == height - 1) && (i != width - 1)) {
					// left bottom corner
					lBorder = true
				}
				let secondary = outer ? outerChar : chars[1 - n]
				let brick = (lBorder ? secondary : primary) + (rBorder ? secondary : primary)
				return brick
			}))
			
			msg.channel.send(`\`\`\`${ruletic.map(x => x.join('')).join('\n')}\`\`\``)
		}
	}
}
