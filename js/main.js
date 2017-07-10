function getAllCites(callback) {
	chrome.storage.local.get(storage => {
		let cites = [];
		for (const key in storage) {
			if (!storage.hasOwnProperty(key))
				continue;
			cites.push(storage[key]);
		}
		callback(cites);
	});
}

function searchCites(query, callback) {
	getAllCites(cites => {
		let results = [];
		for (const cite of cites) {
			if (cite['text'].includes(query) || cite['url'].includes(query)) {
				results.push(cite);
			}
		}
		callback(results);
	});
}

var rendered_cites = [];

function clearCites() {
	for (const cite_node of rendered_cites) {
		cite_node.remove();
	}
}

function renderCites(cites) {
	const MAGIC_COL_STYLES = ['col-xs-12', 'col-sm-12', 'col-md-12', 'col-lg-12'];

	clearCites();

	for (const cite of cites) {
		const main = document.getElementById('main');
		const row = main.appendChild();
		rendered_cites.push(row);
	}


    <div class="row">
      <div class=MAGIC_COL_STYLES>
        <div class="c_panel">
          <div class="panel-body">
            <div class="c_date">21.03.2016 21:24</div>
            <div class="c_content">
              <div class="line-clamp line-clamp-1">
                Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet.
              </div>
              <div class="c_link line-clamp line-clamp-1">
                <a href="">www.ya.ru/jygjsydgf/sduhfkusdhkufha/skdjhfkjsdhkjfhsd/kdsjhfkjdhkfjhdsaf/djflkdsfjlkdsjfladsjf/kdasjfhkjdshkfjdshf/kjhkjhkjh</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

}

//searchCites('метод', renderCites);
getAllCites(renderCites);