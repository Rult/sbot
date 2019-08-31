export const simpleAnswers = [
	{
		r: /^(прив(ет(ствую)?)?|здравствуй(те)?|х[ао]й|хауди)$/,
		t: ["Привет.", "Hello, world!", "Доброго времени суток!"]
	},
	{
		r: /^(пока|до свидания|прощай(те)?|до скорого)$/,
		t: ["Пока!", "До скорой встречи!", "До свидания!"]
	},
	{
		r: /^(([а-я]+ое) утр(ечк)?о)/,
		e: ["🌇", "🌄", "🐦"]
	},
	{
		r: /^(([а-я]+ой) ночи|([а-я]+[иы]х) снов)/,
		e: ["🌃", "🌝", "🌌"]
	},
	{
		r: /^(как дела|что (ты )?делаешь?)/,
		t: ["Отвечаю на твоё сообщение.", "Какие дела могут быть у скрипта?"]
	},
	{
		r: /^((что ты|ты что) такое|(кто ты|ты кто)( такой)?)/,
		t: ["Я – просто скрипт."]
	},
	{
		r: /^((мне )?ску[чшщ]н[оа])/,
		t: [
			"Придумай какую-нибудь игру и закодь бота для неё.\nhttps://discordapp.com/developers/applications/",
			"Как насчёт выучить новый язык?\nhttps://invite.duolingo.com/BDHTZTB5CWWKTTJB3BBQBELDDY",
			"Посмотри Revolution OS https://youtu.be/n1F_MfLRlX0?t=394",
			"Посмотри Коносубу",
			"Посмотри Жожу"
		]
	}
]