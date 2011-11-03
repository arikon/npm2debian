all:

RSYNC_ARIKON=arikon.dev.tools.yandex.net:/home/arikon/projects/bem/npm2debian
rsync-arikon:
	rsync -az -e ssh --delete ./ $(RSYNC_ARIKON)

.PHONY: rsync-arikon
