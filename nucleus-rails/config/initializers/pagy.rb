# Pagy (https://github.com/ddnexus/pagy) — pagination defaults.
# Extras loaded lazily as needed; nav_js is omitted to stay in pure-server
# Turbo territory.
require "pagy/extras/overflow"

Pagy::DEFAULT[:items]    = 25
Pagy::DEFAULT[:size]     = [ 1, 2, 2, 1 ]
Pagy::DEFAULT[:overflow] = :last_page
