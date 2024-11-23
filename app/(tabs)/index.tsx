import React, { useEffect, useState, useRef } from 'react';
import { Image, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Linking, ScrollView, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { Text, View } from '@/components/Themed';
import { usePushNotifications } from "../../usePushNotification";

export default function AppBannerScreen() {
  type DataType = {
    rutaIMG: string;
    artefacto: string;
    Name: string;
  };

  const [data, setData] = useState<DataType[]>([]); // Cambiado para manejar arrays
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentDownload, setCurrentDownload] = useState<string | null>(null); // Identificar qué archivo se está descargando
  const downloadTask = useRef<FileSystem.DownloadResumable | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://royerstore.host8b.me/select.php');
        const result = await response.json();

        if (result.status === 'success' && Array.isArray(result.data)) {
          setData(result.data);
          console.log(result.data);
        } else {
          console.error('Error en la respuesta: Formato inválido');
        }
      } catch (error) {
        console.error('Error al hacer la petición:', error);
      } finally {
        setLoading(false);
      }
    };

    // Configura un intervalo para consultar los datos periódicamente
    const intervalId = setInterval(fetchData, 5000); // 5000ms = 5 segundos

    // Limpia el intervalo al desmontar el componente
    return () => clearInterval(intervalId);
  }, []);
  const downloadApp = async (artefacto: string) => {
    try {
      setDownloading(true);
      setCurrentDownload(artefacto);

      // Ruta donde se guardará el archivo
      const fileUri = `${FileSystem.documentDirectory}app.apk`;

      // Crear la descarga
      const downloadResumable = FileSystem.createDownloadResumable(
        artefacto,
        fileUri,
        {},
        (progressEvent) => {
          const progressPercent = (progressEvent.totalBytesWritten / progressEvent.totalBytesExpectedToWrite) * 100;
          setProgress(progressPercent);
        }
      );

      downloadTask.current = downloadResumable;

      const result = await downloadResumable.downloadAsync();

      setDownloading(false);
      setProgress(0);
      setCurrentDownload(null);

      if (result && result.uri) {
        Alert.alert(
          'Descarga completa',
          'El archivo se ha descargado. ¿Quieres instalarlo ahora?',
          [
            {
              text: 'Cancelar',
              style: 'cancel',
            },
            {
              text: 'Instalar',
              onPress: () => {
                if (Platform.OS === 'android') {
                  Linking.openURL(`file://${result.uri}`);
                } else {
                  Alert.alert('Error', 'La instalación solo es compatible en Android.');
                }
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', 'No se pudo completar la descarga.');
      }
    } catch (error) {
      setDownloading(false);
      setProgress(0);
      setCurrentDownload(null);
      console.error('Error en la descarga:', error);
      Alert.alert('Error', 'No se pudo descargar el archivo.');
    }
  };

  const cancelDownload = async () => {
    if (downloadTask.current) {
      try {
        await downloadTask.current.pauseAsync();
        setDownloading(false);
        setProgress(0);
        setCurrentDownload(null);
        Alert.alert('Descarga cancelada', 'La descarga ha sido cancelada.');
      } catch (error) {
        console.error('Error al cancelar la descarga:', error);
        Alert.alert('Error', 'No se pudo cancelar la descarga.');
      }
    }
  };

  const { expoPushToken, notification } = usePushNotifications();

  console.log(expoPushToken)

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#007bff" />
      ) : data.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No hay aplicaciones disponibles.</Text>
          <Image source={{ uri: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR26k-33Nyv43JIZVpceeP-zeh4GuRzQsu8D0nwhWN1ks2JWpLGDluN0QM9fBYlh9dwqqg&usqp=CAU' }} style={styles.emptyImage} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {data.map((item, index) => (
            <View key={index} style={styles.card}>
              <View style={styles.cardContent}>
                <Image
                  source={{
                    uri: `http://royerstore.host8b.me/${item.rutaIMG}`,
                  }}
                  style={styles.logo}
                  resizeMode="contain"
                />
                <View style={styles.infoContainer}>
                  <Text style={styles.title}>{item.Name}</Text>
                  {downloading && currentDownload === item.artefacto ? (
                    <View style={styles.progressContainer}>
                      <Text style={styles.progressText}>{`Descargando: ${progress.toFixed(0)}%`}</Text>
                      <ActivityIndicator size="small" color="#007bff" />
                      <TouchableOpacity style={styles.cancelButton} onPress={cancelDownload}>
                        <Text style={styles.cancelText}>Cancelar</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.downloadButton} onPress={() => downloadApp(item.artefacto)}>
                      <Text style={styles.downloadText}>Instalar</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>


  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  scrollContainer: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 4,
    elevation: 3,
    padding: 15, // Se amplió el padding para hacerlo más espacioso
    marginVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '95%', // Más ancho, pero sin ocupar todo el espacio
    alignSelf: 'center', // Centrado en la pantalla
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logo: {
    width: 80, // Se amplió el tamaño de la imagen para que se vea más proporcionada
    height: 80,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: '#f0f0f0',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 18, // Se aumentó ligeramente el tamaño del texto
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  downloadButton: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 25, // Se amplió para hacer el botón más prominente
    alignItems: 'center',
  },
  downloadText: {
    color: '#ffffff',
    fontSize: 16, // Texto más grande en el botón
    fontWeight: 'bold',
  },
  progressContainer: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressText: {
    marginRight: 10,
    fontSize: 14,
    color: '#333',
  },
  cancelButton: {
    marginLeft: 10,
    backgroundColor: '#ff4444',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  cancelText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#555',
    marginBottom: 20,
    textAlign: 'center',
  },
  emptyImage: {
    width: 150,
    height: 150,
    resizeMode: 'contain',
  },
});

