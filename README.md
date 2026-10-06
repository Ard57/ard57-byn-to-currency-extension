# BYN prices in USD/EUR/RUB

Belarusian marketplaces price everything in Belarusian rubles, and comparing an offer on
one site with an offer on another means reaching for a converter every time.
This extension does it for you: every BYN price gets its equivalent in USD,
EUR and RUB printed right underneath, on every page you already visit.

For comparison only
-------------------

The converted figures are there to help you weigh one offer against another
across different platforms. They are a reference, nothing more: every listing
is priced in Belarusian rubles, and every deal, payment and agreement is made
in Belarusian rubles. Rates move daily, so treat a converted price as a guide
to roughly what a listing is worth, never as the amount anyone is asking.

Nothing to do
-------------

There is nothing to switch on, click or hover over. Open a search page and the
conversions are already on the cards; open a listing and they are under its
price. The same goes for prices that appear as you go — cards in a map popup,
a booking total once you pick dates, a hotel room rate, the price per square
metre on a property ad.

It reads like part of the page
------------------------------

Converted prices borrow the look of the price they belong to: the site's own
font, weight and colour, a little smaller and quieter so the original price
stays the one you see first. Placement follows the room available — all three
currencies on one line where a card is wide, stacked where it is narrow — so
nothing is pushed out of shape and nothing overlaps.

Only the asking price is converted. Monthly leasing payments, loan ranges,
"from N per month" offers and similar figures are left exactly as they are.

Supported sites
---------------

 - onliner.by
 - kufar.by
 - av.by
 - abw.by
 - realt.by
 - flatby.by

Search pages, ad pages, map cards and the prices tucked inside booking forms
are all covered, along with the price per square metre on property ads.

Where a site offers several currencies of its own, the extension converts the
prices it finds in Belarusian rubles.

Exchange rates
--------------

Rates come from the Frankfurter API, which publishes the European Central
Bank's reference rates. The ECB updates them once per working day at around
16:00 Central European Time, and they do not move again until the next
publication — Friday's rates still stand on Sunday.

The extension refreshes shortly after each publication, between 17:15 and
17:30 CET, and keeps the result in your browser. Everything you browse after
that reads those stored rates, so ordinary browsing makes no requests at all,
and prices still convert if you go offline.

Frankfurter was chosen because it answers from anywhere. The National Bank of
Belarus publishes its own rates, but that service is not reachable from every
country, so prices would stop converting the moment you travelled or switched
on a VPN. Here they keep working wherever you browse from.

Privacy
-------

The extension talks to one address, the rates API, and asks it only for
exchange rates. It sends nothing about you, the pages you open or the prices
you look at. Your settings and the latest rates are stored in your own
browser, and nowhere else.
