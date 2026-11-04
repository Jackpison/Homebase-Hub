After the install, open the site and click the key icon. It asks for a setup code, which only the server's owner can read:

    sudo cat __DATA_DIR__/core/SETUP-CODE.php

Your data is in `__DATA_DIR__`, outside the site. Update the site itself in Settings, Updates: a YunoHost upgrade of this package only renews the PHP and nginx settings.
