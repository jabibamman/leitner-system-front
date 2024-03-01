import { createVuetify } from 'vuetify'
import 'vuetify/styles'

const vuetify = createVuetify({
    theme: {
        themes: {
            light: {
                colors: {
                    primary: '#FF5722',
                    secondary: '#FF9800',
                    accent: '#FFC107',
                    error: '#f44336',
                    warning: '#ffeb3b',
                    info: '#03a9f4',
                    success: '#4caf50'
                },
            },
            dark: {
                colors: {
                    primary: '#FF5722',
                    secondary: '#FF9800',
                    accent: '#FFC107',
                    error: '#f44336',
                    warning: '#ffeb3b',
                    info: '#03a9f4',
                    success: '#4caf50'
                },
            },
        },
    },

})

export default vuetify