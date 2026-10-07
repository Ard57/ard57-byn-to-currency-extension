# BYN prices in USD/EUR/RUB

Belarusian marketplaces price everything in Belarusian rubles, and comparing
an offer on one site with an offer on another means reaching for a converter
every time. This extension does it for you: every BYN price gets its
equivalent in USD, EUR and RUB printed right underneath, on every page you
already visit.

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

---

# Цены в BYN в USD, EUR и RUB

Белорусские площадки выставляют всё в белорусских рублях, и чтобы сравнить
предложение на одном сайте с предложением на другом, каждый раз приходится
лезть в конвертер. Расширение делает это за вас: рядом с каждой ценой в BYN
появляется её эквивалент в USD, EUR и RUB — прямо на тех страницах, которые
вы и так открываете.

Только для сравнения
--------------------

Пересчитанные суммы нужны лишь для того, чтобы сравнивать предложения на
разных площадках. Это ориентир, и не более: все объявления выставлены в
белорусских рублях, и любая сделка, оплата и договорённость проходят в
белорусских рублях. Курсы меняются каждый день, поэтому считайте пересчёт
прикидкой стоимости, а не суммой, которую с вас просят.

Ничего делать не нужно
----------------------

Ничего не надо включать, нажимать или наводить. Открываете поиск — пересчёт
уже стоит в карточках; открываете объявление — он под ценой. То же самое с
ценами, которые появляются по ходу: карточки во всплывающем окне на карте,
итог бронирования после выбора дат, стоимость номера в отеле, цена за
квадратный метр в объявлении о недвижимости.

Выглядит как часть страницы
---------------------------

Пересчитанная цена перенимает вид той цены, к которой относится: шрифт,
насыщенность и цвет самого сайта, только чуть мельче и спокойнее, чтобы
исходная цена по-прежнему читалась первой. Расположение зависит от места:
все три валюты в строку, где карточка широкая, и столбиком, где узкая, —
так ничего не разъезжается и не налезает друг на друга.

Пересчитывается только цена объявления. Ежемесячные платежи по лизингу,
суммы кредитов, предложения «от N рублей в месяц» и подобные числа остаются
как есть.

Поддерживаемые сайты
--------------------

 - onliner.by
 - kufar.by
 - av.by
 - abw.by
 - realt.by
 - flatby.by

Страницы поиска, страницы объявлений, карточки на карте и цены внутри форм
бронирования — всё это учитывается, как и цена за квадратный метр в
объявлениях о недвижимости.

Если сайт сам умеет показывать несколько валют, расширение пересчитывает те
цены, которые указаны в белорусских рублях.

Курсы валют
-----------

Курсы берутся из Frankfurter API, который публикует справочные курсы
Европейского центрального банка. ЕЦБ обновляет их раз в рабочий день, около
16:00 по центральноевропейскому времени, и до следующей публикации они не
меняются: в воскресенье действуют пятничные курсы.

Расширение обновляет их вскоре после публикации, между 17:15 и 17:30 CET, и
сохраняет результат в браузере. Всё, что вы открываете дальше, читает уже
сохранённые курсы, поэтому обычный просмотр не делает ни одного запроса, а
цены пересчитываются даже без интернета.

Frankfurter выбран потому, что отвечает откуда угодно. У Национального банка
Беларуси есть свои курсы, но его сервис доступен не из каждой страны, и цены
перестали бы пересчитываться, стоило бы уехать или включить VPN. Здесь они
работают, откуда бы вы ни заходили.

Конфиденциальность
------------------

Расширение обращается всего по одному адресу — к API курсов — и спрашивает
только курсы валют. Оно ничего не сообщает ни о вас, ни о страницах, которые
вы открываете, ни о ценах, которые вы смотрите. Настройки и последние курсы
хранятся в вашем браузере и больше нигде.
