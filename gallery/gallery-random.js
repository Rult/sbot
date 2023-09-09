const fs = require('fs')

const dirname = '../pages/files/gallery/'

let {filterImages, parseTags} = require(dirname + 'filter-imgs.js')

let imgList = require(dirname + 'imgs.json')

//function prepareTags(getParams) {
//	let match = getParams.match(/[&?]tags=([^&?]*)/i)
//	if (!match || !match[1]) {
//		return null
//	}
//	
//	return parseTags(decodeURIComponent(match[1]))
//}

let genDelta = 1367 // must be a prime number
let genPos = Math.floor(Math.random() * genDelta)

function sendImg(req, res) {
	if (imgList == null) {
		// extra check
		return res.status(500).send('cannot get the list of imgs')
	}

	let qGroups = null
	let useRandom = false
	if (req.query.tags) {
		try {
		    qGroups = parseTags(req.query.tags)
			
			if (qGroups) {
				if (qGroups.map((item) => item.length).reduce((a, b) => a + b, 0) > 16) {
					return res.status(400).send('too many tags')
				}
			}
		} catch(err) {
			res.status(400).send('invalid expression for tags')
		}
	}
	if (req.query.random) {
		useRandom = true
	}
	
	//console.time('filterImages')
	let passedIds = filterImages(imgList, qGroups)
	//console.timeEnd('filterImages')

	res.setHeader('Content-Type', 'text/json; charset=utf-8')
	res.setHeader('Access-Control-Allow-Origin', '*')

	if (passedIds.length != 0) {
		let availableCount = passedIds.length
		let randomPos = 0
		if (useRandom) {
			// pick randomly
			randomPos = Math.floor(Math.random() * availableCount)
		} else {
			// pick every image once without repetition
			randomPos = genPos % availableCount
			genPos += genDelta
		}
		let randomId = passedIds[randomPos]
		
		let resultRaw = imgList[randomId]
		resultRaw.id = randomId
		let result = JSON.stringify(resultRaw)
		res.end(result)
	} else {
		res.end('{"error": "Таких изображений нет D:"}')
	}
}

module.exports = (req, res) => {
	if (imgList == null) {
		fs.readFile(dirname + 'imgs.json', 'utf8', (err, data) => {
			if (err) {
				console.error('File not found: imgs.json')
				console.log('Function check: ' + typeof filterImages)
				return res.status(500).send('cannot get the list of imgs, file not found')
			}
			
			imgList = JSON.parse(data, true)
			
			sendImg(req, res)
		})
	} else {
		sendImg(req, res)
	}
}
