;(
	function()
	{
		var Router = function()
		{
			this.routes = {
				current: ''
				, previous: null
				, clear: null
				, defined: {}
			};
		};
		Router.prototype = {
			clear: function(fn)
			{
				this.routes.clear = fn;
			}
			, map: function(path)
			{
				if(this.routes.defined.hasOwnProperty(path))
				{
					return this.routes.defined[path];
				}
				else
				{
					var route = new Route(path);
					this.routes.defined[path] = route;
					return route;
				}
			}
			, match: function(path, parameterize)
			{
				for(var route in this.routes.defined)
				{
					if(route === null || route === undefined)
					{
						continue;
					}
					route = this.routes.defined[route];
					var possibleRouters = route.partition();
					for(j = 0, l = possibleRouters.length; j < l; j++)
					{
						var slice = possibleRouters[j]
							, compare = path;
						if(/\*|@/.test(slice))
						{
							var slicePaths = slice.split('/')
								, params = {};
							for(i = 0, len = slicePaths.length; i < len; i++)
							{
								if((i < compare.split('/').length) && (slicePaths[i][0] === '@'))
								{
									var pattern = /@([^:]+):(.+)/
										, match = slicePaths[i].match(pattern);
									if(match)
									{
										var paramName = match[1]
											, patternStr = slicePaths[i].split(':')[1]
											, patternRegexp = new RegExp('^' + patternStr + '$')
											, paramValue = compare.split('/')[i];
										if(patternRegexp.test(paramValue))
										{
											params[paramName] = paramValue;
										}
										else
										{
											params[paramName] = undefined;
										}
									}
									else
									{
										params[slicePaths[i].replace(/@/, '')] = compare.split('/')[i];
									}
									compare = compare.replace(compare.split('/')[i], slicePaths[i]);
								}
								if((i + 1) == slicePaths.length && slicePaths[i] === '*' && compare.split('/').length >= i)
								{
									var compPaths = compare.split('/').slice(i)
										, n = 0;
									while(true)
									{
										if(compPaths[n] === undefined)
										{
											break;
										}
										params[compPaths[n]] = compPaths[n + 1];
										n = n + 2;
									}
									compare = compare.split('/').slice(0, i).join('/') + '/*';
								}
							}
						}
						if(slice === compare)
						{
							if(parameterize)
							{
								route.params = params;
							}
							return route;
						}
					}
				}
				return null;
			}
			, start: function()
			{
				this.dispatch();
				if('onhashchange' in window)
				{
					window.onhashchange = this.dispatch.bind(this);
				}
				else
				{
					setInterval(this.dispatch.bind(this), 50);
				}
			}
			, dispatch: function()
			{
				this.routes.previous = this.routes.current;
				this.routes.current = location.hash;
				var matchedRouter = this.match(location.hash, true);
				if(this.routes.previous)
				{
					var previousRouter = this.match(this.routes.previous);
					if(previousRouter !== null && previousRouter.afterAction !== null)
					{
						previousRouter.afterAction();
					}
				}
				if(matchedRouter !== null)
				{
					matchedRouter.run();
				}
				else
				{
					if(this.routes.clear !== null)
					{
						this.routes.clear();
					}
				}
			}
		};
		var Route = function(path)
		{
			this.path = path;
			this.action = [];
			this.params = {};
			this.getParam = function(name, defaultValue)
			{
				return typeof(this.params[name]) !== 'undefined' ? this.params[name] : defaultValue;
			};
			this.getAllParams = function()
			{
				return this.params;
			};
			this.beforeAction = [];
			this.afterAction = null;
			return this;
		};
		Route.prototype = {
			to: function(fn)
			{
				this.action.push(fn);
				return this;
			}
			, before: function(fns)
			{
				if(fns instanceof Array)
				{
					this.beforeAction = this.beforeAction.concat(fns);
				}
				else
				{
					this.beforeAction.push(fns);
				}
				return this;
			}
			, after: function(fn)
			{
				this.afterAction = fn;
				return this;
			}
			, partition: function()
			{
				var parts = []
					, options = []
					, re = /\(([^}]+?)\)/g
					, text, i;
				if(['#', '#/', '', false, '#/*', '*'].includes(this.path))
				{
					return [''];
				}
				while(text = re.exec(this.path))
				{
					parts.push(text[1]);
				}
				options.push(this.path.split('(')[0]);
				for(i = 0, l = parts.length; i < l; i++)
				{
					options.push(options[options.length - 1] + parts[i]);
				}
				return options;
			}
			, run: function()
			{
				var haltExecution = false
					, i, result, previous;
				if(this.hasOwnProperty('beforeAction'))
				{
					if(this.beforeAction.length > 0)
					{
						for(i = 0, l = this.beforeAction.length; i < l; i++)
						{
							result = this.beforeAction[i]();
							if(result === false)
							{
								haltExecution = true;
								break;
							}
						}
					}
				}
				if(!haltExecution)
				{
					for(var n in this.action)
					{
						if(this.params)
						{
							this.action[n].apply(this, Object.values(this.params));
						}
						else
						{
							this.action[n].call(this);
						}
					}
				}
			}
		};
		var instance = new Router();
		['map', 'start'].forEach(
			function(method)
			{
				Router[method] = function()
				{
					return instance[method].apply(instance, arguments);
				};
			}
		);
		if(typeof module !== 'undefined' && typeof exports === 'object')
		{
			module.exports = Router;
		}
		else
		{
			window.Router = Router;
		}
	}
)();