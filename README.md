# Как запустить на своём токене

0. Устанавливаем nodejs версии 12 (модуль canvas ломается на более поздних версиях), наиболее удобно это сделать через nvm: `nvm install 12`
(nvm на винде удобно поставить через [scoop](https://scoop.sh/), на линуксах найдете сами)
1. Клонируем репу 
`git clone https://github.com/Rult/sbot.git`
2. Заходим в корень
`cd sbot`
3. Создаём файл `.env`:
```
BOT_TOKEN=ваш_токен 
# не секрет!!! находится во вкладке Bots

IMGUR_ID=ваш_имгур_айди 
# для отправки пикч на Имгур, сейчас не используется

OWNER_ID=ваш_личный_дискорд_айди 
# чтобы бот понимал, что вы - его владелец

BOT_SHORT_NAME=sb 
# какое имя будет отображаться в статусе

ACCEPTABLE_BOT_NICKNAME=ыи|c,|[сcs][бb6]|сбот|стилл?бот|sbot|still?bot 
# на что бот может откликаться
``` 
4. Ставим зависимости 
`npm install`
5. Запускаем 
`npm start`