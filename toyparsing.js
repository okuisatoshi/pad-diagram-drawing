// A toy monadic parser combinator library


class _Undefined extends Error {}


class ParserFailure extends Error {}


const parser_do = function(do_func) {
    const parser = function(s) {
	    const run = function(m, opts) {
	        const nullable  = opts && opts.nullable  || false;
	        const throwable = opts && opts.throwable || false;
	        const r = m(s);
	        if (typeof r !== 'undefined') {
                s = r.s;
                return r.a;
	        }
	        if (nullable) return undefined;
	        if (throwable) throw new ParserFailure();
	        throw new _Undefined();
	    };

	    try {
	        return {a: do_func(run), s: s};
	    }
	    catch (e) {
	        if (e instanceof _Undefined) return undefined;
            throw e;
	    }
    };

    parser.bind = function(f) {
        return parser_do(run => run(f(run(this))));
    };

    parser.fmap = function(f) {
        return parser_do(run => f(run(this)));
    };

    return parser;
};


const unit = a => parser_do(run => a);


const get = s => ({a: s, s: s});


const put = s => _ => ({a: s, s: s});


const fail = _ => undefined;


const empty = unit([]);


const toParser = p => typeof p === "string" ? word(p).fmap(_ => []) : p;


const word = w =>
    parser_do(run => {
        let s = run(get);
        const n = s.match(/^\s*/)[0].length;
        s = s.slice(n)
        if (s.slice(0,w.length) === w) {
            run(put(s.slice(w.length)));
            return w;
        }
        run(fail);
    });


const pattern = re =>
    parser_do(run => {
	let s = run(get);
        const n = s.match(/^\s*/)[0].length;
        s = s.slice(n)
        const r = s.match(new RegExp('^' + re))
        if (r) {
            const w = r[0]
            run(put(s.slice(w.length)));
            return w;
        }
        run(fail);
    });


const cat = (p1, p2) =>
    parser_do(run => {
        let a1 = run(toParser(p1));
        if (!(a1 instanceof Array)) a1 = [a1];
        let a2 = run(toParser(p2));
        if (!(a2 instanceof Array)) a2 = [a2];
        return a1.concat(a2);
    });


const seq = (...args) => args.reduce(cat,empty);


const or = (p1, p2) =>
    parser_do(run => {
        const a = run(toParser(p1),{nullable: true});
        if (typeof a !== 'undefined') return a;
        return run(toParser(p2))
    });


const oneOf = (...args) => args.reduce(or,fail);


const optional = p => or(p, empty);


const moreThan0 = p => {
    // Consume at least one character; fail, otherwise
    const q = parser_do(run => {
        const s = run(get);
        const a = run(p);
        if (run(get).length < s.length) return a;
        run(fail);
    });
    // Need a thunk to avoid infinite recursive call
    const p_star = parser_do(run => run(or(cat(q,p_star),empty)));
    return p_star;
};


const moreThan1 = p => cat(p,moreThan0(p));


const sepBy = (p,sep) => cat(p,moreThan0(cat(sep,p)));


exports.ParserFailure = ParserFailure;
exports.parser_do = parser_do;
exports.get = get;
exports.put = put;
exports.pattern = exports.pat = pattern;
exports.word = exports.w = word;
exports.fail = fail;
exports.empty = empty;
exports.seq = seq;
exports.oneOf = exports.one_of = oneOf;
exports.optional = exports.opt = optional;
exports.moreThan0 = exports.for_at_least0 = moreThan0;
exports.moreThan1 = exports.for_at_least1 = moreThan1;
exports.sepBy = exports.sep_by = sepBy;
