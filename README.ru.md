# npm2debian
**npm2debian** это инструмент командной строки предназначенный для конвертации пакетов из реестра npmjs.org в готовый для сборки Debian пакет. 

## Обзор
 
	npm2debian [опции] <имя пакета из реестра NPM>

## Опции

	-h, --help                     : показать подсказку для опций
	-o OUTPUT, --output=OUTPUT     : изменить директорию с результатом
	--versioned                    : подготовить Debian пакет с указанием версии
	--no-package-prefix            : не указывать префикс для Debian пакетов
	-m MAINTAINER,
	--maintainer=MAINTAINER        : указать имя сопровождающего Debian пакет
	-e EMAIL, --email=EMAIL        : указать email сопровождающего Debian пакет
	-p PACKAGEPREFIX,
	--package-prefix=PACKAGEPREFIX : указать Debian префикс для имени пакета
	-u DEBVERSION,
	--debian-version=DEBVERSION    : указать Debian версию для пакета
	-b DEBBUILD,
	--debian-build=DEBBUILD        : указать Debian package build
	-v, --version                  : показать версию инструмента

## Окружение 

  При работе используются следующие переменные окружения 

	EMAIL="Адрес электронной почты"
	DEBFULLNAME="Имя и Фамилия сопровождающего пакет"

  Для работы инструмента необходимы следующие Debian пакеты:

	sudo apt-get install devscripts dh-make

  Для сборки сконвертированных пакетов установите следующие Debian пакеты:

	sudo apt-get install debhelper fakeroot dpkg-dev

## Установка

  Есть несколько способов установки.

 * В систему вы можете установить утилиту глобально в виде пакета npm

	`npm -g install npm2debian`

 * Локальная установка

	`npm install npm2debian`

 * Установка из исходников

	```
	git clone https://github.com/arikon/npm2debian
	cd npm2debian
	npm install
	```

## Примеры использования
  
 * Конвертирование пакета `bem`:

	`npm2debian bem`

	В результате в директории `npm-bem-<version>` будет создан сорцовый пакет для сборки одного бинарного пакета `npm-bem`.

 * Для создания пакета с версией в имени нужно указать опцию `--versioned`:

	`npm2debian --versioned bem`

	В результате в директории `npm-bem-<version>` будет создан сорцовый пакет для сборки двух бинарных пакетов:

	 * `npm-bem`
	 * `npm-bem-<dashed-version>`, где `<dashed-version>`, это версия, где вместо точек используются дефисы

 * Сборка конвертированного Debian пакета:

	```
	cd npm-bem*
	dpkg-buildpackage -rfakeroot
	```
