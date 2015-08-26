# npm2debian
**npm2debian** is a command line tool to convert packages from npmjs.org repository to Debian packages.

Contributions are welcome, we have [some tasks](https://github.com/arikon/npm2debian/issues) to do.

## Overview

	npm2debian [options] <package>

## Options

	-h, --help                     : Help
	-o OUTPUT, --output=OUTPUT     : Output directory
	--versioned                    : Build versioned debian package
	--no-package-prefix            : Do not add prefix to Debian package name
	-m MAINTAINER,
	--maintainer=MAINTAINER        : Debian package maintainer name
	-e EMAIL, --email=EMAIL        : Debian package maintainer email
	-p PACKAGEPREFIX,
	--package-prefix=PACKAGEPREFIX : Debian package name prefix
	-u DEBVERSION,
	--debian-version=DEBVERSION    : Debian package version
	-b DEBBUILD,
	--debian-build=DEBBUILD        : Debian package build
	--registry=REGISTRY            : Registry for npm install
	-v, --version                  : Show version

## Environment

  These environmanet variables are used during the packaging:

	EMAIL="email@address"
	DEBFULLNAME="Maintainer Full Name"

  You will need the following Debian packages for the tool to work:

	sudo apt-get install devscripts dh-make

  You will need the following Debian packages to build debs:

	sudo apt-get install debhelper fakeroot dpkg-dev

## Install

  You have several options.

 * Install globally from npm repository

	`npm -g install npm2debian`

 * Install locally

	`npm install npm2debian`

 * Install from sources

	```
	git clone https://github.com/arikon/npm2debian
	cd npm2debian
	npm install
	```

## Usage examples

 * Simple converting of `bem` package to `npm-bem`:

	`npm2debian bem`

	It will create `npm-bem-<version>` directory with source Debian package describing only one binary package `npm-bem`.

 * To get Debian package with version in its name you should specify `--versioned` options:

	`npm2debian --versioned bem`

	It will create `npm-bem-<version>` directory with source Debian package describing two binary packages:

	 * `npm-bem`
	 * `npm-bem-<dashed-version>`, where `<dashed-version>` is a package version with dots replaced to dashes

 * To build debs run:

	```
	cd npm-bem*
	dpkg-buildpackage -rfakeroot
	```

<!-- Yandex.Metrika counter -->
<img src="//mc.yandex.ru/watch/12831025" style="position:absolute; left:-9999px;" alt="" />
<!-- /Yandex.Metrika counter -->
