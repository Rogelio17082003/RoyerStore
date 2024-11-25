import { useState, useEffect, useRef } from "react";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";



export interface PushNotificationState {
  expoPushToken?: Notifications.ExpoPushToken;
  notification?: Notifications.Notification;
}

export const usePushNotifications = (): PushNotificationState => {

  const [thisToken, setthisToken] = useState(""); // Estado para la conexión


  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldShowAlert: true,
      shouldSetBadge: false,
    }),
  });
  // Configuración del canal de notificación en Android
Notifications.setNotificationChannelAsync('default', {
  name: 'default',
  importance: Notifications.AndroidImportance.MAX,
  sound: 'default', // Habilita el sonido
  vibrationPattern: [0, 250, 250, 250],
  lightColor: '#FF231F7C',
});

  const [expoPushToken, setExpoPushToken] = useState<
    Notifications.ExpoPushToken | undefined
  >();

  const [notification, setNotification] = useState<
    Notifications.Notification | undefined
  >();

  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  async function registerForPushNotificationsAsync() {
    let token;
    if (Device.isDevice) {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== "granted") {
        alert("Failed to get push token for push notification");
        return; 
      }

      token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas.projectId,
      });
      setthisToken(token.data)

      // Enviar token a la API
      if (token) {
        try {
          const response = await fetch(
          `https://robe.host8b.me/royerstore/enviarToken.php`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                
                token: token.data, // token.data contiene el token como string 
              }),
            }
          ); 

          if (!response.ok) {
            console.error("Error enviando el token a la API:", response.statusText);7
             
          } else {
            console.log("Token enviado correctamente a la API");
          }
        } catch (error) {
          console.error("Error en la solicitud a la API:", error);
        }
      }





    } else {
      alert("Must be using a physical device for Push notifications ");
    }

    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }

    return token;
  }

  useEffect(() => {
    // Definir un intervalo para ejecutar la función cada 3 segundos
    const interval = setInterval(() => {
      registerForPushNotificationsAsync().then((token) => {
        setExpoPushToken(token);
      });
    }, 3000); // 3000 ms = 3 segundos
  
    // Configurar listeners de notificaciones
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        setNotification(notification);
      });
  
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log(response);
      });
  
    // Limpiar el intervalo y los listeners al desmontar
    return () => {
      clearInterval(interval); // Detener el intervalo
      Notifications.removeNotificationSubscription(notificationListener.current!);
      Notifications.removeNotificationSubscription(responseListener.current!);
    };
  }, []);

  return {
    expoPushToken,
    notification, 
  };
};