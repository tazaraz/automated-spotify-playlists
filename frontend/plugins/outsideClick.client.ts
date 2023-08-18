export default defineNuxtPlugin((nuxtApp) => {
    const handlers: { [uid: number]: (event: Event) => void } = {};
    document.body.addEventListener('click', event => Object.values(handlers).forEach(handler => handler(event)))

    nuxtApp.vueApp.directive('click-outside', {
        mounted (el, binding, vnode) {
            el.uid = el.uid || Math.random();

            handlers[el.uid] = (event) => {
                // Check that click was outside the el and his childrens
                if (!(el == event.target || el.contains(event.target))) {
                    // If so, call method provided in attribute value
                    binding.value(event);
                }
            };
        },
        unmounted: function (el) {
            delete handlers[el.uid];
        },
    });
})